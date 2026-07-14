import { z } from "zod";
import { AuthPermissionSchema, RolesKeys } from "./auth/auth-permissions";
import { getUser } from "./auth/auth-user";
import { ApplicationError } from "./errors/application-error";
import { ZodRouteError } from "./errors/zod-route-error";
import { logger } from "./logger";
import { getCurrentOrg } from "./organizations/get-org";
import { notifyServerError } from "./server/admin-notifications";

type RouteMetadata = {
  roles?: (typeof RolesKeys)[number][];
  permissions?: z.infer<typeof AuthPermissionSchema>;
};

type RouteContext = Record<string, unknown>;

type RouteMiddleware<TContext extends RouteContext> = (args: {
  request: Request;
  metadata: RouteMetadata;
  next: (args: { ctx: TContext }) => Promise<{ ctx: TContext }>;
}) => Promise<{ ctx: TContext }>;

class RouteBuilder<TContext extends RouteContext = Record<string, never>> {
  constructor(
    private readonly middleware?: RouteMiddleware<TContext>,
    private readonly metadataSchema?: z.ZodType<RouteMetadata>,
  ) {}

  use<TNextContext extends RouteContext>(
    middleware: RouteMiddleware<TNextContext>,
  ) {
    return new RouteBuilder<TNextContext>(middleware);
  }

  defineMetadata(schema: z.ZodType<RouteMetadata>) {
    return new RouteBuilder<TContext>(
      this.middleware,
      schema as z.ZodType<RouteMetadata>,
    );
  }

  metadata(metadata: RouteMetadata) {
    const parsedMetadata = this.metadataSchema
      ? this.metadataSchema.parse(metadata)
      : metadata;
    return new RouteDefinition<TContext>(
      this.middleware,
      parsedMetadata,
      undefined,
      undefined,
      undefined,
    );
  }

  params<TParams>(schema: z.ZodType<TParams>) {
    return new RouteDefinition<TContext>(
      this.middleware,
      {},
      schema,
      undefined,
      undefined,
    );
  }

  body<TBody>(schema: z.ZodType<TBody>) {
    return new RouteDefinition<TContext>(
      this.middleware,
      {},
      undefined,
      schema,
      undefined,
    );
  }

  query<TQuery>(schema: z.ZodType<TQuery>) {
    return new RouteDefinition<TContext>(
      this.middleware,
      {},
      undefined,
      undefined,
      schema,
    );
  }

  handler<TData>(
    handler: (
      request: Request,
      args: { ctx: TContext },
    ) => Promise<TData> | TData,
  ) {
    return new RouteDefinition<TContext>(
      this.middleware,
      {},
      undefined,
      undefined,
      undefined,
    ).handler(handler);
  }
}

class RouteDefinition<
  TContext extends RouteContext,
  TParams = unknown,
  TBody = unknown,
  TQuery = unknown,
> {
  constructor(
    private readonly middleware: RouteMiddleware<TContext> | undefined,
    private readonly metadataValue: RouteMetadata,
    private readonly paramsSchema: z.ZodType<TParams> | undefined,
    private readonly bodySchema: z.ZodType<TBody> | undefined,
    private readonly querySchema: z.ZodType<TQuery> | undefined,
  ) {}

  metadata(metadata: RouteMetadata) {
    return new RouteDefinition<TContext, TParams, TBody, TQuery>(
      this.middleware,
      metadata,
      this.paramsSchema,
      this.bodySchema,
      this.querySchema,
    );
  }

  params<TNextParams>(schema: z.ZodType<TNextParams>) {
    return new RouteDefinition<TContext, TNextParams, TBody, TQuery>(
      this.middleware,
      this.metadataValue,
      schema,
      this.bodySchema,
      this.querySchema,
    );
  }

  body<TNextBody>(schema: z.ZodType<TNextBody>) {
    return new RouteDefinition<TContext, TParams, TNextBody, TQuery>(
      this.middleware,
      this.metadataValue,
      this.paramsSchema,
      schema,
      this.querySchema,
    );
  }

  query<TNextQuery>(schema: z.ZodType<TNextQuery>) {
    return new RouteDefinition<TContext, TParams, TBody, TNextQuery>(
      this.middleware,
      this.metadataValue,
      this.paramsSchema,
      this.bodySchema,
      schema,
    );
  }

  handler<TData>(
    handler: (
      request: Request,
      args: {
        ctx: TContext;
        params: TParams;
        body: TBody;
        query: TQuery;
      },
    ) => Promise<TData> | TData,
  ) {
    return async (request: Request, paramsInput?: unknown) => {
      try {
        const ctx = this.middleware
          ? (
              await this.middleware({
                request,
                metadata: this.metadataValue,
                next: async ({ ctx }) => ({ ctx }),
              })
            ).ctx
          : ({} as TContext);
        const params = this.paramsSchema
          ? this.paramsSchema.parse(paramsInput)
          : (paramsInput as TParams);
        const body = this.bodySchema
          ? this.bodySchema.parse(await request.json())
          : (undefined as TBody);
        const url = new URL(request.url);
        const queryObject = Object.fromEntries(url.searchParams.entries());
        const query = this.querySchema
          ? this.querySchema.parse(queryObject)
          : (queryObject as TQuery);
        const data = await handler(request, { ctx, params, body, query });
        return data instanceof Response ? data : Response.json(data);
      } catch (error) {
        const normalizedError =
          error instanceof Error ? error : new Error(String(error));
        return handleServerError(normalizedError, request);
      }
    };
  }
}

export const route = new RouteBuilder();

export const authRoute = route.use(async ({ next }) => {
  const user = await getUser();

  if (!user) {
    throw new ZodRouteError("Session not found!", 401);
  }

  return next({
    ctx: { user },
  });
});

const extractOrgIdFromUrl = (url: string): string | null => {
  const match = url.match(/\/api\/orgs\/([^/]+)/);
  return match?.[1] ?? null;
};

export const orgRoute = route
  .defineMetadata(
    z.object({
      roles: z.array(z.enum(RolesKeys)).optional(),
      permissions: AuthPermissionSchema.optional(),
    }),
  )
  .use(async ({ next, metadata, request }) => {
    const orgSlugOrId = extractOrgIdFromUrl(request.url);

    const organization = await getCurrentOrg({
      ...metadata,
      orgSlugOrId: orgSlugOrId ?? undefined,
    });

    if (!organization) {
      throw new ZodRouteError(
        "You need to be part of an organization to access this resource.",
        401,
      );
    }

    return next({
      ctx: { organization },
    });
  });

async function handleServerError(e: Error, request: Request) {
  if (e instanceof ZodRouteError) {
    logger.debug("[DEV] - ZodRouteError", e);
    return Response.json(
      { message: e.message },
      {
        status: e.status,
      },
    );
  }

  if (e instanceof ApplicationError) {
    logger.debug("[DEV] - ApplicationError", e);
    return Response.json({ message: e.message }, { status: 400 });
  }

  logger.info("Unknown Error", e);
  const requestId = crypto.randomUUID();
  await notifyServerError({
    title: "Server route failed",
    request,
    error: e,
    requestId,
  });

  return Response.json({ message: "Internal server error" }, { status: 500 });
}
