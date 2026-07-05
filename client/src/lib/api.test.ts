import { describe, expect, it } from "vitest";
import { resolveApiBase } from "./api";

describe("resolveApiBase", () => {
  it("uses the configured API URL in production", () => {
    expect(
      resolveApiBase(
        "coinnova-trading.netlify.app",
        "https://coinnova-trading-platform.onrender.com",
        true,
      ),
    ).toBe("https://coinnova-trading-platform.onrender.com");
  });

  it("falls back to the local backend during local development", () => {
    expect(resolveApiBase("localhost", "", false)).toBe("http://localhost:3001");
  });

  it("uses a relative API path on non-local hosts without a configured URL", () => {
    expect(resolveApiBase("coinnova-trading.netlify.app", "", false)).toBe("/api");
  });
});
