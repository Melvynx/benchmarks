import type { NavigationGroup } from "@/features/navigation/navigation.type";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  Coins,
  Database,
  Flag,
  ImageIcon,
  ListChecks,
  MessageSquare,
  ScrollText,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

const ADMIN_PATH = "/admin";

const ADMIN_LINKS: NavigationGroup[] = [
  {
    title: "Admin",
    links: [
      { href: ADMIN_PATH, Icon: BarChart3, label: "Dashboard" },
      { href: `${ADMIN_PATH}/users`, Icon: Users, label: "Users" },
      {
        href: `${ADMIN_PATH}/organizations`,
        Icon: Building2,
        label: "Organizations",
      },
      {
        href: `${ADMIN_PATH}/feedback`,
        Icon: MessageSquare,
        label: "Feedback",
      },
      { href: `${ADMIN_PATH}/leads`, Icon: ListChecks, label: "Leads" },
    ],
  },
  {
    title: "Thumbfast Ops",
    links: [
      { href: `${ADMIN_PATH}/funnel`, Icon: TrendingUp, label: "Funnel" },
      {
        href: `${ADMIN_PATH}/generations`,
        Icon: ImageIcon,
        label: "Generations",
        links: [
          {
            href: `${ADMIN_PATH}/generations/logs`,
            Icon: ScrollText,
            label: "API logs",
          },
        ],
      },
      {
        href: `${ADMIN_PATH}/inspirations`,
        Icon: Sparkles,
        label: "Inspirations",
      },
      { href: `${ADMIN_PATH}/errors`, Icon: AlertTriangle, label: "Errors" },
      { href: `${ADMIN_PATH}/referrals`, Icon: Coins, label: "Referrals" },
      { href: `${ADMIN_PATH}/migrations`, Icon: Database, label: "Migrations" },
      {
        href: `${ADMIN_PATH}/feature-flags`,
        Icon: Flag,
        label: "Feature Flags",
      },
    ],
  },
] satisfies NavigationGroup[];

export const getAdminNavigation = () => ADMIN_LINKS;
