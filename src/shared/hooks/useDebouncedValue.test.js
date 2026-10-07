import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "./useDebouncedValue";

afterEach(() => vi.useRealTimers());

describe("useDebouncedValue", () => {
  it("publishes only the latest value after exactly 300ms", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: "" } },
    );

    rerender({ value: "연" });
    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe("");

    rerender({ value: "연화" });
    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe("");
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe("연화");
  });
});
