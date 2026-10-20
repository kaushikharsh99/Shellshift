import { describe, expect, it } from "vitest";
import { parseRosterCsv } from "./roster";
const header = "team_name,email_1,email_2,email_3,email_4\n";
describe("competition CSV roster", () => {
  it("normalizes member emails and ignores unpopulated slots", () => {
    expect(
      parseRosterCsv(
        header +
          '"Kernel, Panic", ONE@example.org ,two@example.org,,\nSolo,solo@example.org,,,',
      ).teams,
    ).toEqual([
      { name: "Kernel, Panic", emails: ["one@example.org", "two@example.org"] },
      { name: "Solo", emails: ["solo@example.org"] },
    ]);
  });
  it("rejects duplicate emails across teams atomically", () => {
    const result = parseRosterCsv(
      header + "A,a@example.org,,,\nB,A@example.org,,,",
    );
    expect(result.teams).toEqual([]);
    expect(result.errors.join(" ")).toContain("Row 3");
  });
  it.each([
    "A,,,,",
    "A,bad-email,,,",
    "A,a@example.org,,,extra,overflow",
    '"Unclosed,a@example.org,,,',
  ])("rejects invalid rows: %s", (row) => {
    expect(parseRosterCsv(header + row).errors.length).toBeGreaterThan(0);
  });
  it("requires expected headers and at least one team", () => {
    expect(
      parseRosterCsv("wrong,email\nA,a@example.org").errors.length,
    ).toBeGreaterThan(0);
    expect(parseRosterCsv(header).errors.length).toBeGreaterThan(0);
  });
  it("accepts CRLF, BOM, escaped quotes, and four-member teams", () => {
    const result = parseRosterCsv(
      "\ufeff" +
        header.replace("\n", "\r\n") +
        '"Team ""A""",a@example.org,b@example.org,c@example.org,d@example.org\r\n',
    );
    expect(result.errors).toEqual([]);
    expect(result.teams[0].name).toBe('Team "A"');
    expect(result.teams[0].emails).toHaveLength(4);
  });
});
