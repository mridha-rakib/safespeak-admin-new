import {
  IconBooks,
  IconBuildingCommunity,
  IconCards,
  IconCategory2,
  IconFlag3,
  IconHistory,
  IconLayoutDashboard,
  IconListCheck,
  IconRoute,
  IconScale,
  IconSettings,
  IconTags,
  IconUsersGroup,
  type Icon,
} from "@tabler/icons-react";

export interface NavLink {
  type: "link";
  label: string;
  href: string;
  icon: Icon;
  description: string;
}

export interface NavGroup {
  type: "group";
  label: string;
  items: NavLink[];
}

export type NavSection = NavLink | NavGroup;

/**
 * The single source of truth for admin navigation. The sidebar, mobile nav,
 * breadcrumbs, and the navigation test suite all read from this list so a
 * new route can't silently go missing from one surface but not another.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    type: "link",
    label: "Dashboard",
    href: "/dashboard",
    icon: IconLayoutDashboard,
    description: "Overview of local content, review queue, and recent activity.",
  },
  {
    type: "group",
    label: "Content",
    items: [
      {
        type: "link",
        label: "Knowledge & Legislation",
        href: "/content/knowledge-legislation",
        icon: IconBooks,
        description: "Source documents, legislation, and local AI-readiness preview.",
      },
      {
        type: "link",
        label: "Microcards",
        href: "/content/microcards",
        icon: IconCards,
        description: "Short, plain-language educational cards.",
      },
      {
        type: "link",
        label: "Rights & Legal Information",
        href: "/content/rights-legal-information",
        icon: IconScale,
        description: "Plain-language explanations of rights, not legal advice.",
      },
      {
        type: "link",
        label: "Support Organisations",
        href: "/content/support-organisations",
        icon: IconBuildingCommunity,
        description: "Organisations that offer support services.",
      },
      {
        type: "link",
        label: "Advocates & Counsellors",
        href: "/content/advocates-counsellors",
        icon: IconUsersGroup,
        description: "Individual support professionals and their verification status.",
      },
      {
        type: "link",
        label: "Reporting Destinations",
        href: "/content/reporting-destinations",
        icon: IconFlag3,
        description: "Where an incident can formally be reported.",
      },
    ],
  },
  {
    type: "group",
    label: "Taxonomy & Matching",
    items: [
      {
        type: "link",
        label: "Incident Types",
        href: "/taxonomy/incident-types",
        icon: IconCategory2,
        description: "The categories used to classify an incident.",
      },
      {
        type: "link",
        label: "Triage Labels",
        href: "/taxonomy/triage-labels",
        icon: IconTags,
        description: "Urgency and routing labels used during triage.",
      },
      {
        type: "link",
        label: "Resource Categories",
        href: "/taxonomy/resource-categories",
        icon: IconCategory2,
        description: "Groupings used to organise content for administrators.",
      },
      {
        type: "link",
        label: "Matching Rules",
        href: "/taxonomy/matching-rules",
        icon: IconRoute,
        description: "How incident context connects to content and support.",
      },
    ],
  },
  {
    type: "group",
    label: "Publishing",
    items: [
      {
        type: "link",
        label: "Review Queue",
        href: "/publishing/review-queue",
        icon: IconListCheck,
        description: "Content waiting for a publishing decision.",
      },
      {
        type: "link",
        label: "Audit History",
        href: "/publishing/audit-history",
        icon: IconHistory,
        description: "Local, append-only history of admin actions.",
      },
    ],
  },
  {
    type: "link",
    label: "Settings",
    href: "/settings",
    icon: IconSettings,
    description: "Local data status, demo data reset, and content bundle export.",
  },
];

export function flattenNavLinks(sections: NavSection[] = NAV_SECTIONS): NavLink[] {
  return sections.flatMap((section) => (section.type === "group" ? section.items : [section]));
}

export function findNavLinkForPath(pathname: string): NavLink | undefined {
  const links = flattenNavLinks();
  return links.find((link) => pathname === link.href || pathname.startsWith(`${link.href}/`));
}

export function findGroupLabelForPath(pathname: string): string | undefined {
  for (const section of NAV_SECTIONS) {
    if (section.type !== "group") continue;
    if (section.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))) {
      return section.label;
    }
  }
  return undefined;
}
