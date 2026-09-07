import type { ReactNode } from "react";

type RouteParams = Record<string, string | string[]>;

declare global {
  type PageProps<_Path extends string = string> = {
    params: Promise<RouteParams>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  };

  type LayoutProps<_Path extends string = string> = {
    children: ReactNode;
    params: Promise<RouteParams>;
    modal?: ReactNode;
  };
}

export {};
