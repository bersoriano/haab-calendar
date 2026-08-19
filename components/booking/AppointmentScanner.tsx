"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import type {
  BrowserQRCodeReader as BrowserQRCodeReaderType,
  IScannerControls,
} from "@zxing/browser";

import { ActionButton } from "@/components/ui/ActionButton";
import { BookingStatusPill } from "@/components/ui/BookingStatusPill";
import { SummaryField } from "@/components/ui/SummaryField";
import { formatDateLabel, formatTimeRange } from "@/lib/format";
import type { BookingRecord, Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

const resultCopy = {
  en: {
    title: "Appointment found",
    service: "Service",
    client: "Client",
    contact: "Contact",
    dateAndTime: "Date and time",
    notes: "Notes",
    total: "Total",
  },
  es: {
    title: "Cita encontrada",
    service: "Servicio",
    client: "Cliente",
    contact: "Contacto",
    dateAndTime: "Fecha y horario",
    notes: "Notas",
    total: "Total",
  },
} satisfies Record<Lang, Record<string, string>>;

const scannerCopy = {
  en: {
    title: "Scan appointment",
    body: "Point camera at customer appointment QR.",
    starting: "Starting camera…",
    scanning: "Looking for appointment QR…",
    lookingUp: "Retrieving appointment…",
    upload: "Upload QR image",
    uploadHelp: "Use a saved screenshot when camera access is unavailable.",
    cameraUnavailable: "Camera unavailable. Upload a QR image instead.",
    imageUnreadable: "No appointment QR was found in that image.",
    lookupFailed: "Could not retrieve that appointment.",
    scanAgain: "Scan another",
    close: "Close",
  },
  es: {
    title: "Escanear cita",
    body: "Apunte la cámara al QR de la cita del cliente.",
    starting: "Iniciando cámara…",
    scanning: "Buscando el QR de la cita…",
    lookingUp: "Consultando la cita…",
    upload: "Subir imagen QR",
    uploadHelp: "Use una captura guardada si la cámara no está disponible.",
    cameraUnavailable: "La cámara no está disponible. Suba una imagen QR.",
    imageUnreadable: "No se encontró un QR de cita en esa imagen.",
    lookupFailed: "No se pudo consultar esa cita.",
    scanAgain: "Escanear otra",
    close: "Cerrar",
  },
} satisfies Record<Lang, Record<string, string>>;

type ScannerStatus = "starting" | "scanning" | "looking-up" | "error";

export function AppointmentScanResult({
  booking,
  lang = "en",
}: {
  booking: BookingRecord;
  lang?: Lang;
}) {
  const copy = resultCopy[lang];
  const contact = [booking.clientEmail, booking.clientPhone].filter(Boolean).join(" · ");

  return (
    <section aria-labelledby="appointment-scan-result-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3
          id="appointment-scan-result-title"
          className="text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]"
        >
          {copy.title}
        </h3>
        <BookingStatusPill status={booking.status} lang={lang} />
      </div>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <SummaryField label={copy.client} value={booking.clientName || "—"} />
        <SummaryField label={copy.service} value={booking.serviceName} />
        <SummaryField
          label={copy.dateAndTime}
          value={`${formatDateLabel(booking.dateKey, lang)} · ${formatTimeRange(
            booking.startTime,
            booking.endTime,
            lang,
          )}`}
        />
        {contact ? <SummaryField label={copy.contact} value={contact} /> : null}
        {booking.notes.trim() ? (
          <SummaryField label={copy.notes} value={booking.notes} />
        ) : null}
        {booking.cost ? <SummaryField label={copy.total} value={booking.cost} /> : null}
      </dl>
    </section>
  );
}

export function AppointmentScannerDialog({
  open,
  onClose,
  lang = "en",
}: {
  open: boolean;
  onClose: () => void;
  lang?: Lang;
}) {
  const copy = scannerCopy[lang];
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const readerRef = useRef<BrowserQRCodeReaderType | null>(null);
  const handledCodeRef = useRef(false);
  const sessionRef = useRef(0);
  const [status, setStatus] = useState<ScannerStatus>("starting");
  const [error, setError] = useState("");
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [scanCycle, setScanCycle] = useState(0);

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    const stream = videoRef.current?.srcObject;
    if (stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    }
  }, []);

  const lookupAppointment = useCallback(
    async (code: string) => {
      if (handledCodeRef.current) return;
      const session = sessionRef.current;
      handledCodeRef.current = true;
      stopCamera();
      setError("");
      setStatus("looking-up");

      try {
        const response = await fetch("/api/provider/bookings/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const payload = (await response.json()) as {
          booking?: BookingRecord;
          userMessage?: string;
        };

        if (session !== sessionRef.current) return;

        if (!response.ok || !payload.booking) {
          throw new Error(payload.userMessage || copy.lookupFailed);
        }

        setBooking(payload.booking);
      } catch (lookupError) {
        if (session !== sessionRef.current) return;
        setError(
          lookupError instanceof Error && lookupError.message
            ? lookupError.message
            : copy.lookupFailed,
        );
        setStatus("error");
      }
    },
    [copy.lookupFailed, stopCamera],
  );

  const closeDialog = useCallback(() => {
    sessionRef.current += 1;
    handledCodeRef.current = true;
    stopCamera();
    setBooking(null);
    setError("");
    setStatus("starting");
    onClose();
  }, [onClose, stopCamera]);

  useEffect(() => {
    if (!open || booking) return;

    let cancelled = false;
    handledCodeRef.current = false;

    async function startCamera() {
      try {
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        if (cancelled || !videoRef.current) return;

        const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 200 });
        readerRef.current = reader;
        const controls = await reader.decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: "environment" } } },
          videoRef.current,
          (result, _decodeError, activeControls) => {
            if (!result || handledCodeRef.current) return;
            activeControls.stop();
            void lookupAppointment(result.getText());
          },
        );

        if (cancelled) {
          controls.stop();
          return;
        }

        controlsRef.current = controls;
        setStatus("scanning");
      } catch {
        if (!cancelled) {
          setError(copy.cameraUnavailable);
          setStatus("error");
        }
      }
    }

    void startCamera();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [booking, copy.cameraUnavailable, lookupAppointment, open, scanCycle, stopCamera]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDialog();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeDialog, open]);

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    stopCamera();
    setBooking(null);
    setError("");
    setStatus("looking-up");

    const objectUrl = URL.createObjectURL(file);
    const session = sessionRef.current;
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = readerRef.current ?? new BrowserQRCodeReader();
      readerRef.current = reader;
      handledCodeRef.current = false;
      const result = await reader.decodeFromImageUrl(objectUrl);
      await lookupAppointment(result.getText());
    } catch {
      if (session === sessionRef.current) {
        setError(copy.imageUnreadable);
        setStatus("error");
      }
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  function scanAgain() {
    sessionRef.current += 1;
    stopCamera();
    setBooking(null);
    setError("");
    setStatus("starting");
    setScanCycle((current) => current + 1);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="appointment-scanner-title"
        className="max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-[30px] bg-[var(--surface-lowest)] p-5 shadow-[0_30px_90px_rgba(15,23,42,0.3)] ring-1 ring-[var(--line)] sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="appointment-scanner-title"
              className="text-2xl font-semibold tracking-[-0.04em] text-[var(--ink)]"
            >
              {copy.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{copy.body}</p>
          </div>
          <ActionButton tone="ghost" onClick={closeDialog}>
            {copy.close}
          </ActionButton>
        </div>

        {booking ? (
          <div className="mt-6 rounded-[24px] bg-[var(--surface-soft)] p-5 ring-1 ring-[var(--line)]">
            <AppointmentScanResult booking={booking} lang={lang} />
          </div>
        ) : (
          <>
            <div className="relative mt-6 aspect-[4/3] overflow-hidden rounded-[24px] bg-slate-950">
              <video
                ref={videoRef}
                muted
                playsInline
                className="h-full w-full object-cover"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-[14%] rounded-[24px] border-2 border-white/80 shadow-[0_0_0_999px_rgba(15,23,42,0.22)]"
              />
            </div>

            <p
              role="status"
              aria-live="polite"
              className={cn(
                "mt-4 text-sm font-medium",
                error ? "text-rose-700" : "text-[var(--muted)]",
              )}
            >
              {error ||
                (status === "starting"
                  ? copy.starting
                  : status === "looking-up"
                    ? copy.lookingUp
                    : copy.scanning)}
            </p>
          </>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {booking ? (
            <ActionButton tone="primary" onClick={scanAgain}>
              {copy.scanAgain}
            </ActionButton>
          ) : (
            <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-2xl bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-[var(--on-primary)] transition hover:opacity-90">
              {copy.upload}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(event) => void handleImageUpload(event)}
              />
            </label>
          )}
          {!booking ? (
            <p className="text-xs leading-5 text-[var(--muted)]">{copy.uploadHelp}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
