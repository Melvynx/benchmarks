import { getUser } from "@/lib/auth/auth-user";
import { ZodRouteError } from "@/lib/errors/zod-route-error";
import { getCurrentOrg } from "@/lib/organizations/get-org";
import { authRoute, orgRoute, route } from "@/lib/zod-route";
import { describe, expect, it, vi } from "vitest";

describe("zod-route", () => {
  it("route should handle custom errors", async () => {
    const GET = route.handler(() => {
      throw new ZodRouteError("test");
    });

    const request = new Request("http://localhost/");
    const response = await GET(request, { params: Promise.resolve({}) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ message: "test" });
  });

  it("route should handle custom errors with status", async () => {
    const GET = route.handler(() => {
      throw new ZodRouteError("test", 401);
    });

    const request = new Request("http://localhost/");
    const response = await GET(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toEqual({ message: "test" });
  });

  it("route should handle unknown errors with 500 without leaking details", async () => {
    const GET = route.handler(() => {
      throw new Error("test");
    });

    const request = new Request("http://localhost/");
    const response = await GET(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toEqual({ message: "Internal server error" });
  });

  it("authRoute should return 401 if user is not authenticated", async () => {
    // @ts-expect-error - Testing the case where getUser returns undefined (no session)
    vi.mocked(getUser).mockResolvedValue(undefined);
    const GET = authRoute.handler(() => {
      return {
        message: "test",
      };
    });

    const request = new Request("http://localhost/");
    const response = await GET(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toEqual({ message: "Session not found!" });
  });

  const user = {
    id: "123",
    email: "test@test.com",
    name: "test",
    emailVerified: true,
    createdAt: new Date(1, 1, 1, 1),
    updatedAt: new Date(1, 1, 1, 1),
    banned: null,
  };

  it("authRoute should add the user inside the context if the user is authenticated", async () => {
    vi.mocked(getUser).mockResolvedValue(user);

    const GET = authRoute.handler((_request, { ctx }) => {
      return {
        message: "test",
        user: ctx.user,
      };
    });

    const request = new Request("http://localhost/");
    const response = await GET(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      message: "test",
      user: JSON.parse(JSON.stringify(user)),
    });
  });

  it("orgRoute should add the organization inside the context if the user is authenticated", async () => {
    const organization = {
      id: "123",
      name: "test",
      slug: "test",
      createdAt: new Date(1, 1, 1, 1),
      updatedAt: new Date(1, 1, 1, 1),
      members: [],
      logo: null,
      email: "test@test.com",
      memberRoles: [],
      subscription: null,
      user,
      invitations: [],
      metadata: null,
      stripeCustomerId: null,
      limits: {
        credits: 10,
        maxGenerations: 2,
        maxInspirations: 10,
        maxPersons: 2,
        prioritySupport: false,
        gptImageAccess: false,
        noWatermark: false,
      },
    };
    vi.mocked(getCurrentOrg).mockResolvedValue(organization);

    const GET = orgRoute.handler((_request, { ctx }) => {
      return {
        message: "test",
        org: ctx.organization,
      };
    });

    const request = new Request("http://localhost/");
    const response = await GET(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      message: "test",
      org: JSON.parse(JSON.stringify(organization)),
    });
  });

  it("orgRoute should return 401 if the user is not part of the organization", async () => {
    vi.mocked(getCurrentOrg).mockResolvedValue(null);

    const GET = orgRoute.handler(() => {
      return {
        message: "test",
      };
    });

    const request = new Request("http://localhost/");
    const response = await GET(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toEqual({
      message:
        "You need to be part of an organization to access this resource.",
    });
  });
});
