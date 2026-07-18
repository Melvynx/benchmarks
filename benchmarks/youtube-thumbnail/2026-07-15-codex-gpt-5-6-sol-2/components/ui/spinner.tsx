import { LoaderCircleIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Spinner({ className, ...props }: React.ComponentProps<typeof LoaderCircleIcon>) {
  return (
    <LoaderCircleIcon
      aria-hidden="true"
      data-slot="spinner"
      className={cn("animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
