"use client";

import { upload } from "@vercel/blob/client";
import { UploadSimple, X } from "@phosphor-icons/react";
import { useId, useRef, useState } from "react";

import { Alert, Button } from "@/components/app-ui";
import { bookingTranslations, fillTemplate } from "@/components/booking/i18n/translations";
import {
  ACCEPTED_IMAGE_EXTENSIONS,
  MAX_SERVICE_PHOTOS,
  MAX_SERVICE_PHOTO_BYTES,
  validateImageFile,
} from "@/lib/image-upload";
import type { Lang } from "@/lib/types";

/**
 * Optional photos for one service. Each file goes straight to storage and the
 * draft keeps only its URL, so nothing is published until the service is saved.
 * The first photo is the cover on the public card.
 */
export function ServicePhotosField({
  value,
  onChange,
  disabled,
  lang,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  disabled: boolean;
  lang: Lang;
}) {
  const t = bookingTranslations[lang];
  const labelId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFull = value.length >= MAX_SERVICE_PHOTOS;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);

    const check = validateImageFile(file, MAX_SERVICE_PHOTO_BYTES);
    if (!check.ok) {
      setError(
        check.error === "Use a JPG, PNG, or WEBP image."
          ? t.providerForm.imageTypeError
          : t.providerForm.imageSizeError,
      );
      return;
    }

    setBusy(true);
    try {
      const result = await upload(`service-photos/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
        contentType: file.type,
        clientPayload: "service-photo",
      });
      onChange([...value, result.url]);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error && uploadError.message
          ? uploadError.message
          : t.providerForm.imageUploadError,
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="grid gap-3" role="group" aria-labelledby={labelId}>
      <div>
        <p id={labelId} className="text-sm font-medium text-app-fg">
          {t.admin.photosLabel} {t.publicFlow.optionalSuffix}
        </p>
        <p className="mt-1 text-sm text-app-fg-muted">
          {fillTemplate(t.admin.photosHint, { max: String(MAX_SERVICE_PHOTOS) })}
        </p>
      </div>

      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {value.map((url, index) => (
            <li key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-16 w-24 rounded-lg object-cover" />
              <button
                type="button"
                disabled={disabled}
                aria-label={fillTemplate(t.admin.removePhoto, { n: String(index + 1) })}
                onClick={() => onChange(value.filter((entry) => entry !== url))}
                className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-app-surface text-app-fg shadow ring-1 ring-app-border-strong"
              >
                <X aria-hidden="true" size={12} weight="bold" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {!isFull ? (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_IMAGE_EXTENSIONS}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          <Button
            variant="secondary"
            size="sm"
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
          >
            <UploadSimple aria-hidden="true" size={16} />
            {busy ? t.common.loading : t.admin.addPhoto}
          </Button>
        </div>
      ) : null}

      {error ? <Alert tone="danger">{error}</Alert> : null}
    </div>
  );
}
