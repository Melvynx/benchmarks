import type { RenderOptions } from "@testing-library/react";
import { render } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ReactElement } from "react";

export const setup = (
  jsx: ReactElement,
  options?: Omit<RenderOptions, "queries">,
) => {
  return {
    user: userEvent.setup(),
    ...render(jsx, options),
  };
};
