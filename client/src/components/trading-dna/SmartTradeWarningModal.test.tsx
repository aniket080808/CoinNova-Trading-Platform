import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SmartTradeWarningModal } from "./SmartTradeWarningModal";

describe("SmartTradeWarningModal", () => {
  it("renders without crashing when warnings are missing", () => {
    render(
      <SmartTradeWarningModal
        open
        onOpenChange={() => undefined}
        warning={{ passed: false, riskScore: 70, warnings: undefined as unknown as string[] }}
        onProceed={() => undefined}
      />,
    );

    expect(screen.getByText("Smart Trade Guardian")).toBeInTheDocument();
  });
});
