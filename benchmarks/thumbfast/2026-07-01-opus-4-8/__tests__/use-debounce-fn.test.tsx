import { useDebounceFn } from "@/hooks/use-debounce-fn";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useDebounceFn", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should debounce function calls", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebounceFn(callback, 500));

    // Call the debounced function
    result.current("test");

    // Function should not be called immediately
    expect(callback).not.toHaveBeenCalled();

    // Advance timer by 300ms (less than debounce time)
    vi.advanceTimersByTime(300);
    expect(callback).not.toHaveBeenCalled();

    // Advance timer to reach debounce time
    vi.advanceTimersByTime(200);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith("test");
  });

  it("should reset timer on subsequent calls", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebounceFn(callback, 500));

    // First call
    result.current("test1");

    // Advance timer by 300ms
    vi.advanceTimersByTime(300);
    expect(callback).not.toHaveBeenCalled();

    // Second call should reset the timer
    result.current("test2");

    // Advance timer by 300ms (600ms from start, but only 300ms from second call)
    vi.advanceTimersByTime(300);
    expect(callback).not.toHaveBeenCalled();

    // Advance timer to reach debounce time for second call
    vi.advanceTimersByTime(200);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith("test2");
  });

  it("should use default debounce time when not specified", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebounceFn(callback)); // Default 300ms

    result.current("test");

    // Advance timer by 200ms (less than default debounce time)
    vi.advanceTimersByTime(200);
    expect(callback).not.toHaveBeenCalled();

    // Advance timer to reach default debounce time
    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("should pass multiple arguments to the callback", () => {
    const callback = vi.fn();
    const { result } = renderHook(() =>
      useDebounceFn<[string, number, boolean]>(callback, 500),
    );

    result.current("test", 123, true);

    vi.advanceTimersByTime(500);
    expect(callback).toHaveBeenCalledWith("test", 123, true);
  });
});
