/**
 * Icons travel as names, not components: super admin's layout is a server
 * component, and a component reference cannot cross into the client shell.
 */
export type ShellIconName =
  | "overview"
  | "bookings"
  | "calendar"
  | "analytics"
  | "services"
  | "availability"
  | "appearance"
  | "integrations"
  | "settings"
  | "accounts"
  | "demo"
  | "cleanups"
  | "superAdmin"
  | "back";

export type ShellNavItem = {
  id: string;
  href: string;
  label: string;
  icon: ShellIconName;
  badge?: string | number;
};

export type ShellNavGroup = {
  id: string;
  label?: string;
  items: ShellNavItem[];
};
