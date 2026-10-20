export interface RosterTeamInput {
  name: string;
  emails: string[];
}
export const ROSTER_HEADER = "team_name,email_1,email_2,email_3,email_4";
export const MAX_ROSTER_BYTES = 1_000_000;

/** Strict RFC-style quoted fields; never include private cell contents in errors. */
export function parseRosterCsv(text: string): {
  teams: RosterTeamInput[];
  errors: string[];
} {
  if (new TextEncoder().encode(text).length > MAX_ROSTER_BYTES)
    return { teams: [], errors: ["CSV must be smaller than 1 MB."] };
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false,
    closed = false;
  const errors: string[] = [];
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else field += c;
    } else if (c === "," || c === "\n" || c === "\r") {
      row.push(field);
      field = "";
      closed = false;
      if (c !== ",") {
        rows.push(row);
        row = [];
        if (c === "\r" && text[i + 1] === "\n") i++;
      }
    } else if (c === '"' && !field && !closed) quoted = true;
    else if (closed || c === '"')
      return { teams: [], errors: ["Invalid CSV quoting."] };
    else field += c;
  }
  if (quoted) return { teams: [], errors: ["Unclosed quoted CSV field."] };
  if (field || row.length || closed) {
    row.push(field);
    rows.push(row);
  }
  const headers = rows.shift()?.map((c) => c.trim().toLowerCase());
  if (headers?.join(",") !== ROSTER_HEADER)
    return { teams: [], errors: [`Expected columns: ${ROSTER_HEADER}.`] };
  const teams: RosterTeamInput[] = [],
    names = new Set<string>(),
    emailsSeen = new Set<string>();
  rows.forEach((cells, index) => {
    if (cells.every((c) => !c.trim())) return;
    const line = index + 2;
    const name = cells[0]?.trim();
    const emails = cells
      .slice(1)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (
      cells.length !== 5 ||
      !name ||
      name.length > 100 ||
      emails.length < 1 ||
      emails.length > 4 ||
      emails.some(
        (e) => e.length > 254 || !/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(e),
      )
    ) {
      errors.push(
        `Row ${line}: enter a team name and one to four valid emails in the five template columns.`,
      );
      return;
    }
    if (names.has(name.toLowerCase()))
      errors.push(`Row ${line}: duplicate team name.`);
    names.add(name.toLowerCase());
    for (const email of emails) {
      if (emailsSeen.has(email))
        errors.push(`Row ${line}: an email is listed more than once.`);
      emailsSeen.add(email);
    }
    teams.push({ name, emails });
  });
  if (!teams.length && !errors.length) errors.push("Add at least one team.");
  return { teams: errors.length ? [] : teams, errors };
}
