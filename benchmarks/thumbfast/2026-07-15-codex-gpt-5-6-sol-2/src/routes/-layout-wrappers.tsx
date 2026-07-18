import BaseRouteLayout from "@public-site/(layout)/layout";
import ToolsRouteLayout from "@public-site/(tools)/layout";
import type { ComponentType } from "react";

export function withBaseLayout(Page: ComponentType) {
  return function BaseLayoutRoute() {
    return (
      <BaseRouteLayout>
        <Page />
      </BaseRouteLayout>
    );
  };
}

export function withToolsLayout(Page: ComponentType) {
  return function ToolsLayoutRoute() {
    return (
      <ToolsRouteLayout>
        <Page />
      </ToolsRouteLayout>
    );
  };
}
