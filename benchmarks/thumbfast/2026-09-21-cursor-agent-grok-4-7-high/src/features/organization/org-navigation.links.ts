import type { NavigationGroup } from "@/features/navigation/navigation.type";
import type { AuthRole } from "@/lib/auth/auth-permissions";
import { isInRoles } from "@/lib/organizations/is-in-roles";
import { canAccessThumbnailAgent } from "@/features/agent/thumbnail-agent-access";
import {
  Bot,
  Code2,
  CreditCard,
  Gift,
  Grid3X3,
  Home,
  Image,
  ImagePlus,
  Key,
  Lightbulb,
  Settings,
  TriangleAlert,
  User2,
  Users,
  Video,
} from "lucide-react";

const replaceSlug = (href: string, slug: string): string =>
  href.replace(":organizationSlug", slug);

export const getOrganizationNavigation = (
  slug: string,
  userRoles: AuthRole[] | undefined,
  options: { thumbnailAgentEnabled?: boolean } = {},
): NavigationGroup[] => {
  const thumbnailAgentRole = getThumbnailAgentNavigationRole(userRoles);
  const canViewThumbnailAgent = canAccessThumbnailAgent({
    role: thumbnailAgentRole,
    features: { thumbnailAgentEnabled: options.thumbnailAgentEnabled },
  });

  return ORGANIZATION_LINKS.reduce<NavigationGroup[]>((acc, group) => {
    const filteredLinks = group.links
      .filter((link) => {
        if (link.requiresThumbnailAgentAccess) return canViewThumbnailAgent;
        return !link.roles || isInRoles(userRoles, link.roles);
      })
      .map((link) => ({
        ...link,
        href: replaceSlug(link.href, slug),
      }));

    if (filteredLinks.length === 0) return acc;

    acc.push({
      ...group,
      defaultOpenStartPath: group.defaultOpenStartPath
        ? replaceSlug(group.defaultOpenStartPath, slug)
        : undefined,
      links: filteredLinks,
    });

    return acc;
  }, []);
};

function getThumbnailAgentNavigationRole(userRoles: AuthRole[] | undefined) {
  if (userRoles?.includes("owner")) return "owner";
  if (userRoles?.includes("admin")) return "admin";
  return userRoles?.[0];
}

const ORGANIZATION_PATH = `/orgs/:organizationSlug`;

export const ORGANIZATION_LINKS: NavigationGroup[] = [
  {
    title: "Thumbnails",
    links: [
      { href: ORGANIZATION_PATH, Icon: Home, label: "Dashboard" },
      {
        href: `${ORGANIZATION_PATH}/thumbnails`,
        Icon: Image,
        label: "Thumbnails",
      },
      {
        href: `${ORGANIZATION_PATH}/generations`,
        Icon: Grid3X3,
        label: "Generations",
      },
      {
        href: `${ORGANIZATION_PATH}/agent`,
        Icon: Bot,
        label: "Agent",
        badge: "Beta",
        requiresThumbnailAgentAccess: true,
        roles: ["admin"],
      },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: `${ORGANIZATION_PATH}/persons`, Icon: Users, label: "Persons" },
      {
        href: `${ORGANIZATION_PATH}/inspirations`,
        Icon: Lightbulb,
        label: "Inspirations",
      },
      { href: `${ORGANIZATION_PATH}/images`, Icon: ImagePlus, label: "Images" },
      { href: `${ORGANIZATION_PATH}/videos`, Icon: Video, label: "Videos" },
    ],
  },
  {
    title: "Organization",
    defaultOpenStartPath: `${ORGANIZATION_PATH}/settings`,
    links: [
      {
        href: `${ORGANIZATION_PATH}/settings`,
        Icon: Settings,
        label: "Settings",
        roles: ["admin"],
      },
      {
        href: `${ORGANIZATION_PATH}/settings/members`,
        Icon: User2,
        label: "Members",
        roles: ["admin"],
      },
      {
        href: `${ORGANIZATION_PATH}/settings/billing`,
        Icon: CreditCard,
        label: "Billing",
        roles: ["admin"],
      },
      {
        href: `${ORGANIZATION_PATH}/settings/referral`,
        Icon: Gift,
        label: "Referral",
      },
      {
        href: `${ORGANIZATION_PATH}/settings/api-keys`,
        Icon: Key,
        label: "Custom API Keys",
        roles: ["admin"],
      },
      {
        href: `${ORGANIZATION_PATH}/settings/developer`,
        Icon: Code2,
        label: "Developer",
        roles: ["admin"],
      },
      {
        href: `${ORGANIZATION_PATH}/settings/danger`,
        Icon: TriangleAlert,
        label: "Danger Zone",
        roles: ["owner"],
      },
    ],
  },
] satisfies NavigationGroup[];
