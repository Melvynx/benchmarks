import { useCurrentOrg } from "@/features/organization/current-org-store";

export function useNoWatermark(): boolean {
  const currentOrg = useCurrentOrg();
  return currentOrg?.limits.noWatermark ?? false;
}
