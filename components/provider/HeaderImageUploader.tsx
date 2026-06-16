"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { cn } from "@/lib/utils";
import {
  ACCEPTED_IMAGE_EXTENSIONS,
  validateImageFile,
} from "@/lib/image-upload";

const buttonClass =
  "inline-flex min-h-10 items-center justify-center rounded-xl bg-white px-3 text-sm font-semibold text-[var(--ink)] ring-1 ring-[rgba(193,198,214,0.45)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_26px_rgba(25,28,29,0.05)] transition-colors hover:text-[var(--primary-container)] disabled:cursor-not-allowed disabled:opacity-45";

export function HeaderImageUploader({
  value,
  onChange,
  disabled = false,
}: {
  value?: string;
  onChange: (url: string | undefined) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    const check = validateImageFile(file);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setBusy(true);
    try {
      const result = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
        contentType: file.type,
      });
      onChange(result.url);
    } catch (uploadError) {
      // Surface the route's "storage not configured" / offline / size errors.
      let message = "Upload failed. Check your connection and try again.";
      if (uploadError instanceof Error && uploadError.message) {
        message = uploadError.message;
      }
      setError(message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="grid gap-2 text-sm font-medium text-[var(--ink)]">
      Header image
      <p className="text-xs leading-5 text-[var(--muted)]">
        Shown as a banner at the top of your public page, above the list to book.
      </p>

      {value ? (
        <div className="overflow-hidden rounded-2xl ring-1 ring-[rgba(193,198,214,0.45)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- remote Blob URL, no layout shift concern in admin */}
          <img
            src={value}
            alt="Header banner preview"
            className="aspect-[3/1] w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex aspect-[3/1] w-full items-center justify-center rounded-2xl border border-dashed border-[rgba(193,198,214,0.55)] bg-[rgba(248,249,250,0.5)] text-xs text-[var(--muted)]">
          No header image yet
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_EXTENSIONS}
        disabled={disabled || busy}
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
          className={buttonClass}
        >
          {busy ? "Uploading…" : value ? "Replace image" : "Upload image"}
        </button>
        {value ? (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => {
              setError(null);
              onChange(undefined);
            }}
            className={cn(
              buttonClass,
              "text-[#be123c] hover:text-[#be123c] hover:bg-[#fff1f2]",
            )}
          >
            Remove
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="text-xs font-medium text-[#be123c]">{error}</p>
      ) : null}
    </div>
  );
}
