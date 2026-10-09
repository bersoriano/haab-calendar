"use client";

import {
  ArrowLeft,
  Broom,
  Browsers,
  CalendarBlank,
  ChartLineUp,
  Clock,
  GearSix,
  ListChecks,
  PaintBrush,
  PlugsConnected,
  ShieldStar,
  SquaresFour,
  Stack,
  UsersThree,
  type Icon,
} from "@phosphor-icons/react";
import type { ShellIconName } from "@/components/app-shell/types";

const ICONS: Record<ShellIconName, Icon> = {
  overview: SquaresFour,
  bookings: ListChecks,
  calendar: CalendarBlank,
  analytics: ChartLineUp,
  services: Stack,
  availability: Clock,
  appearance: PaintBrush,
  integrations: PlugsConnected,
  settings: GearSix,
  accounts: UsersThree,
  demo: Browsers,
  cleanups: Broom,
  superAdmin: ShieldStar,
  back: ArrowLeft,
};

export function ShellIcon({ name, active = false }: { name: ShellIconName; active?: boolean }) {
  const Component = ICONS[name];
  return <Component aria-hidden="true" size={20} weight={active ? "fill" : "regular"} className="shrink-0" />;
}
