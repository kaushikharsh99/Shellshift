import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LiveTimer } from "../LiveTimer";
import { CompetitionEndedModal } from "./CompetitionEndedModal";

function elements(node: React.ReactNode): React.ReactElement<any>[] {
  if (!React.isValidElement(node)) return [];
  return [node, ...React.Children.toArray((node.props as any).children).flatMap(elements)];
}

afterEach(() => vi.useRealTimers());

describe("shared event clock and concluded-event actions", () => {
  it("shows the full event time remaining rather than a fixed 20-minute window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-21T12:00:00Z"));
    const html = renderToStaticMarkup(React.createElement(LiveTimer, {
      deadlineAt: "2026-10-21T12:45:00Z",
    }));
    expect(html).toContain("45:00");
    expect(html).toContain("Event remaining");
    expect(html).not.toContain("20:00");
  });

  it("does not call the timeout handler during rendering of an expired clock", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-21T12:45:00Z"));
    const onTimeUp = vi.fn();
    const html = renderToStaticMarkup(React.createElement(LiveTimer, {
      deadlineAt: "2026-10-21T12:00:00Z", onTimeUp,
    }));
    expect(html).toContain("00:00");
    expect(onTimeUp).not.toHaveBeenCalled();
  });

  it("provides native navigation links using the run's event when no gameId prop is passed", () => {
    const html = renderToStaticMarkup(React.createElement(CompetitionEndedModal, {
      runData: { game: { id: "event-123" } }, onClose: vi.fn(),
    }));
    expect(html).toContain('href="/games/event-123/standings"');
    expect(html).toContain('href="/games/event-123/lobby"');
    expect(html).toContain('role="dialog"');
  });

  it("Review Terminal invokes the dismiss action", () => {
    const onClose = vi.fn();
    const tree = CompetitionEndedModal({ runData: {}, onClose });
    const reviewButton = elements(tree).find(element => element.type === "button");
    expect(reviewButton).toBeDefined();
    reviewButton!.props.onClick();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
