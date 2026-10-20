import { describe, expect, it } from "vitest";
import { postLoginDestination } from "./postLogin";
describe("roster onboarding redirects", () => {
  it("sends new players to onboarding while preserving the game destination", () => {
    expect(postLoginDestination("USER", "/games/game/lobby", false)).toBe(
      "/register?redirect=%2Fgames%2Fgame%2Flobby",
    );
  });
  it("returns joined players and admins to the intended internal destination", () => {
    expect(postLoginDestination("USER", "/profile", true)).toBe("/profile");
    expect(postLoginDestination("ADMIN", "/admin", false)).toBe("/admin");
  });
  it("preserves explicit onboarding competition and destination through sign-in", () => {
    expect(
      postLoginDestination("USER", "/register?eventId=second-game", false),
    ).toBe("/register?eventId=second-game");
    expect(
      postLoginDestination(
        "USER",
        "/register?redirect=%2Fgames%2Fsecond-game",
        false,
      ),
    ).toBe("/register?redirect=%2Fgames%2Fsecond-game");
  });
  it("rejects external redirects, backslashes, and control characters", () => {
    for (const url of [
      "//evil.test",
      "/\\evil.test",
      "https://evil.test",
      "/games\n",
    ])
      expect(postLoginDestination("ADMIN", url, false)).toBe("/games");
  });
});
