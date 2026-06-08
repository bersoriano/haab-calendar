"use client";

import type { ProviderInfo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { adminFieldClass } from "@/components/provider/adminGlass";

export function ProviderInfoForm({
  provider,
  onChange,
  disabled = false,
}: {
  provider: ProviderInfo;
  onChange: <K extends keyof ProviderInfo>(key: K, value: ProviderInfo[K]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-4">
      <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
        Full name
        <input
          disabled={disabled}
          value={provider.fullName}
          onChange={(event) => onChange("fullName", event.target.value)}
          placeholder="Dr. Maya Alvarez"
          className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
        Business name
        <input
          disabled={disabled}
          value={provider.businessName}
          onChange={(event) => onChange("businessName", event.target.value)}
          placeholder="Haab Health Studio"
          className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
        Confirmation email
        <input
          disabled={disabled}
          value={provider.email}
          onChange={(event) => onChange("email", event.target.value)}
          placeholder="bookings@haabcalendar.com"
          type="email"
          className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
        />
      </label>
    </div>
  );
}
