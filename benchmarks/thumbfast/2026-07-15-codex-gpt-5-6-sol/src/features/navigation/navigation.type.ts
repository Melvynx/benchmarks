import type { AuthRole } from "@/lib/auth/auth-permissions";
import type { IconProps } from "@radix-ui/react-icons/dist/types";
import type { LucideIcon } from "lucide-react";

export type NavigationGroup = {
  title: string;
  roles?: AuthRole[];
  links: NavigationLink[];
  defaultOpenStartPath?: string;
};

type NavigationLink = {
  href: string;
  Icon:
    | React.ForwardRefExoticComponent<
        IconProps & React.RefAttributes<SVGSVGElement>
      >
    | LucideIcon;
  label: string;
  roles?: AuthRole[];
  hidden?: boolean;
  requiresThumbnailAgentAccess?: boolean;
  badge?: string;
  links?: NavigationLink[];
};
