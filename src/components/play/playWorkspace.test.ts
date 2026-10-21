import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CompletionSummary } from "./CompletionSummary";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("terminal-first play workspace", () => {
  it("provides PlayShell with terminal dominance and game status rail", () => {
    const playShell = readFileSync("src/components/play/PlayShell.tsx", "utf8");
    expect(playShell).toContain("PlayShell");
    expect(playShell).toContain("Terminal");
    expect(playShell).toContain("ObjectiveBar");
    expect(playShell).toContain("ContextPanel");
    expect(playShell).toContain("CompletionSummary");
  });

  it("provides ContextPanel focused on cipher clues", () => {
    const contextPanel = readFileSync("src/components/play/ContextPanel.tsx", "utf8");
    expect(contextPanel).toContain("ContextPanel");
    expect(contextPanel).toContain("Clues");
  });

  it("renders verified completion details and a generic next-mission button", () => {
    const html = renderToStaticMarkup(React.createElement(CompletionSummary, {
      runData: { id: "run", gameId: "game", finalScore: 1200.84, commandCount: 4, durationMs: 118470, nextChallenge: { id: "next", title: "Hidden next question name" } },
    }));
    const text = html.replace(/<[^>]+>/g," ").replace(/\s+/g," ");
    expect(text).not.toContain("Verified Time");
    expect(text).toContain("Final Score");
    expect(text).toContain("Commands Executed");
    expect(text).toContain("Next mission");
    expect(text).not.toContain("Hidden next question name");
  });

  it("ensures Terminal uses semantic presentation without raw emoji icons", () => {
    const terminal = readFileSync("src/components/Terminal.tsx", "utf8");
    expect(terminal).not.toContain("🏆");
  });

  it("ensures Results page reflects individual player outcome without team bias", () => {
    const results = readFileSync("src/app/results/[runId]/page.tsx", "utf8");
    expect(results).toContain("Individual");
    expect(results).toContain("Command History");
  });

  it("provides CompetitionEndedModal and graceful end transitions in PlayShell", () => {
    const playShell = readFileSync("src/components/play/PlayShell.tsx", "utf8");
    expect(playShell).toContain("CompetitionEndedModal");
    expect(playShell).toContain("Leaderboard");
    expect(playShell).toContain("onTimeUp");

    const modal = readFileSync("src/components/play/CompetitionEndedModal.tsx", "utf8");
    expect(modal).toContain("Competition Concluded");
    expect(modal).toContain("Go to Event Leaderboard");
    expect(modal).toContain("standings");

    const timer = readFileSync("src/components/LiveTimer.tsx", "utf8");
    expect(timer).toContain("onTimeUp");
  });
});
