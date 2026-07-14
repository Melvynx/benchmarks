import { safePromise, unwrapSafePromise } from "@/lib/promises";
import { describe, expect, it } from "vitest";

describe("promises utilities", () => {
  describe("safePromise", () => {
    it("should return data and null error when promise resolves", async () => {
      const result = await safePromise(Promise.resolve("test data"));

      expect(result.data).toBe("test data");
      expect(result.error).toBeNull();
    });

    it("should return null data and error when promise rejects", async () => {
      const testError = new Error("test error");
      const result = await safePromise(Promise.reject(testError));

      expect(result.data).toBeNull();
      expect(result.error).toEqual(testError);
    });

    it("should convert non-Error rejection to Error object", async () => {
      const result = await safePromise(Promise.reject("string error"));

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe("string error");
    });
  });

  describe("unwrapSafePromise", () => {
    it("should return data when no error occurred", async () => {
      const safeResult = Promise.resolve({
        data: "test data",
        error: null,
      });

      const result = await unwrapSafePromise(safeResult);
      expect(result).toBe("test data");
    });

    it("should throw error when error occurred", async () => {
      const testError = new Error("test error");
      const safeResult = Promise.resolve({
        data: null,
        error: testError,
      });

      await expect(unwrapSafePromise(safeResult)).rejects.toThrow(testError);
    });

    it("should throw error when data is null but no error provided", async () => {
      const safeResult = Promise.resolve({
        data: null,
        error: null,
      });

      await expect(unwrapSafePromise(safeResult)).rejects.toThrow(
        "Data is null but no error was provided",
      );
    });
  });
});
