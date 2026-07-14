import type React from "react";
import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import { create } from "zustand";

type CurrentOrgStore = {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  subscription: {
    status?: string | null;
    plan?: string | null;
    overrideLimits?: unknown;
  } | null;
  limits: {
    maxGenerations: number;
    noWatermark: boolean;
  };
};

export const useCurrentOrg = create<CurrentOrgStore | null>(() => null);

export const InjectCurrentOrgStore = (
  props: PropsWithChildren<{
    org?: Omit<CurrentOrgStore, "limits">;
  }>,
): React.ReactNode => {
  const org = props.org;

  useEffect(() => {
    if (!org) return;

    const currentState = useCurrentOrg.getState();
    if (currentState?.id === org.id) return;

    useCurrentOrg.setState({
      ...org,
      limits: {
        maxGenerations: 2,
        noWatermark: false,
      },
    });
  }, [org]);

  return props.children;
};
