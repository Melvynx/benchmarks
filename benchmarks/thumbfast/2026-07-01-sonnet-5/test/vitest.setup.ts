import "@testing-library/jest-dom/vitest";

import type { AuthClientType } from "@/lib/auth-client";
import { cleanup } from "@testing-library/react";
import { fetch } from "cross-fetch";
import type { Resend } from "resend";
import type Stripe from "stripe";
import { beforeEach, vi } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";

type ReadonlySearchParams = URLSearchParams;

beforeEach(() => {
  cleanup();
});

// MOCKS

// Mock localStorage
const mockLocalStorage: Record<string, string> = {};
Object.defineProperty(window, "localStorage", {
  value: {
    getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      mockLocalStorage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      mockLocalStorage[key] = undefined as unknown as string;
    }),
    clear: vi.fn(() => {
      Object.keys(mockLocalStorage).forEach((key) => {
        mockLocalStorage[key] = undefined as unknown as string;
      });
    }),
  },
  writable: true,
});

// Mock TanStack navigation compatibility helpers.
vi.mock("@/compat/navigation", async () => {
  const actual = await vi.importActual("@/compat/navigation");
  // Helper to create a fully mocked URLSearchParams that passes TypeScript checks
  const createMockSearchParams = (
    defaultParams: Record<string, string> = {},
  ) => {
    const params = new Map(Object.entries(defaultParams));

    // Create an empty iterator
    const emptyIterator = {
      next: () => ({ done: true, value: undefined }),
      [Symbol.iterator]: function () {
        return this;
      },
    };

    return {
      get: vi.fn((key: string) => params.get(key) ?? null),
      getAll: vi.fn((key: string) =>
        params.has(key) ? [params.get(key) as string] : [],
      ),
      has: vi.fn((key: string) => params.has(key)),
      keys: vi.fn(() =>
        params.size
          ? Array.from(params.keys())[Symbol.iterator]()
          : emptyIterator,
      ),
      values: vi.fn(() =>
        params.size
          ? Array.from(params.values())[Symbol.iterator]()
          : emptyIterator,
      ),
      entries: vi.fn(() =>
        params.size
          ? Array.from(params.entries())[Symbol.iterator]()
          : emptyIterator,
      ),
      forEach: vi.fn(
        (
          callback: (
            value: string,
            key: string,
            parent: URLSearchParams,
          ) => void,
        ) => {
          params.forEach((value, key) => {
            // Using mock parent as URLSearchParams is not constructable in tests
            callback(value, key, {} as URLSearchParams);
          });
        },
      ),
      toString: vi.fn(() => {
        return Array.from(params.entries())
          .map(([key, value]) => `${key}=${value}`)
          .join("&");
      }),
      // These props need to be present for ReadonlyURLSearchParams interface
      append: vi.fn(),
      delete: vi.fn(),
      set: vi.fn(),
      sort: vi.fn(),
      size: params.size,
      [Symbol.iterator]: vi.fn(() => params.entries()),
    };
  };

  return {
    ...actual,
    useSearchParams: vi.fn().mockReturnValue(createMockSearchParams()),
    readonlySearchParamsHook: vi.fn().mockReturnValue(createMockSearchParams()),
  };
});

const stripe = mockDeep<Stripe>();
const authClient = mockDeep<AuthClientType>();
const resend = mockDeep<Resend>();
global.fetch = fetch;

vi.mock("@/lib/stripe", () => ({ stripe }));
vi.mock("@/lib/auth-client", () => ({ authClient }));
vi.mock("@/lib/mail/resend", () => ({ resend }));
vi.mock("@/lib/env", () => ({ env: {} }));
vi.mock("@/lib/auth/auth-user", () => ({
  getUser: vi.fn(),
  getRequiredUser: vi.fn(),
}));
vi.mock("@/lib/organizations/get-org", () => ({
  getCurrentOrg: vi.fn(),
  getRequiredCurrentOrg: vi.fn(),
}));

// Define the type for our global helper

declare global {
  var createTestSearchParams: (
    params?: Record<string, string>,
  ) => ReadonlySearchParams;
}

beforeEach(() => {
  // Reset mocks
  mockReset(stripe);
  mockReset(authClient);

  // Reset localStorage mock
  vi.mocked(window.localStorage.getItem).mockClear();
  vi.mocked(window.localStorage.setItem).mockClear();
  vi.mocked(window.localStorage.removeItem).mockClear();
  vi.mocked(window.localStorage.clear).mockClear();

  // Mock toast
  vi.mock("sonner", () => ({
    toast: {
      error: vi.fn(),
      success: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    },
  }));

  // Clear localStorage without using delete
  Object.keys(mockLocalStorage).forEach((key) => {
    mockLocalStorage[key] = undefined as unknown as string;
  });

  // Expose helper for creating search params mocks with specific values
  global.createTestSearchParams = (
    params: Record<string, string> = {},
  ): ReadonlySearchParams => {
    const mockSearchParams = {
      get: vi.fn((key: string) => params[key] ?? null),
      getAll: vi.fn((key: string) => (params[key] ? [params[key]] : [])),
      has: vi.fn((key: string) => key in params),
      keys: vi.fn(() => Object.keys(params)[Symbol.iterator]()),
      values: vi.fn(() => Object.values(params)[Symbol.iterator]()),
      entries: vi.fn(() => Object.entries(params)[Symbol.iterator]()),
      forEach: vi.fn(
        (
          callback: (
            value: string,
            key: string,
            parent: URLSearchParams,
          ) => void,
        ) => {
          Object.entries(params).forEach(([key, value]) => {
            // Using mock parent as URLSearchParams is not constructable in tests
            callback(value, key, {} as URLSearchParams);
          });
        },
      ),
      toString: vi.fn(() => {
        return Object.entries(params)
          .map(([key, value]) => `${key}=${value}`)
          .join("&");
      }),
      // These props need to be present for ReadonlyURLSearchParams interface
      append: vi.fn(),
      delete: vi.fn(),
      set: vi.fn(),
      sort: vi.fn(),
      size: Object.keys(params).length,
      [Symbol.iterator]: vi.fn(() => Object.entries(params)[Symbol.iterator]()),
    };

    return mockSearchParams as ReadonlySearchParams;
  };
});
