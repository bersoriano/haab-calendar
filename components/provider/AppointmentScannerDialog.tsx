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

import { QrCode, UploadSimple } from "@phosphor-icons/react";

import {
  Alert,
  Badge,
  Button,
  DescriptionItem,
  DescriptionList,
  Dialog,
  buttonStyles,
} from "@/components/app-ui";
import { bookingTranslations } from "@/components/booking/i18n/translations";
import { bookingStatusBadgeTone, formatDateLabel, formatTimeRange } from "@/lib/format";
import type { BookingRecord, Lang } from "@/lib/types";

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

  const t = bookingTranslations[lang];
  const statusLabel =
    booking.status === "cancelled"
      ? t.publicFlow.statusCancelled
      : booking.status === "rescheduled"
        ? t.publicFlow.statusUpdated
        : t.publicFlow.statusConfirmed;

  return (
    <section aria-labelledby="appointment-scan-result-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="appointment-scan-result-title" className="text-base font-semibold text-app-fg">
          {copy.title}
        </h3>
        <Badge tone={bookingStatusBadgeTone(booking.status)} dot>
          {statusLabel}
        </Badge>
      </div>
      <DescriptionList className="mt-3">
        <DescriptionItem flush term={copy.client}>
          {booking.clientName || "—"}
        </DescriptionItem>
        <DescriptionItem flush term={copy.service}>
          {booking.serviceName}
        </DescriptionItem>
        <DescriptionItem flush term={copy.dateAndTime}>
          {`${formatDateLabel(booking.dateKey, lang)} · ${formatTimeRange(booking.startTime, booking.endTime, lang)}`}
        </DescriptionItem>
        {contact ? (
          <DescriptionItem flush term={copy.contact}>
            {contact}
          </DescriptionItem>
        ) : null}
        {booking.notes.trim() ? (
          <DescriptionItem flush term={copy.notes}>
            {booking.notes}
          </DescriptionItem>
        ) : null}
        {booking.cost ? (
          <DescriptionItem flush term={copy.total}>
            {booking.cost}
          </DescriptionItem>
        ) : null}
      </DescriptionList>
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

  const statusText =
    error ||
    (status === "starting" ? copy.starting : status === "looking-up" ? copy.lookingUp : copy.scanning);

  return (
    <Dialog
      open
      onClose={closeDialog}
      title={copy.title}
      description={copy.body}
      closeLabel={copy.close}
      footer={
        booking ? (
          <div className="flex justify-end">
            <Button leadingIcon={<QrCode aria-hidden="true" size={16} />} onClick={scanAgain}>
              {copy.scanAgain}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-app-fg-muted">{copy.uploadHelp}</p>
            {/* A label styled as the primary button, so the file input stays native. */}
            <label
              className={buttonStyles({
                className:
                  "cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-app-accent",
              })}
            >
              <UploadSimple aria-hidden="true" size={16} />
              {copy.upload}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(event) => void handleImageUpload(event)}
              />
            </label>
          </div>
        )
      }
    >
      {booking ? (
        <AppointmentScanResult booking={booking} lang={lang} />
      ) : (
        <div className="grid gap-3">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-app-fg">
            <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-[14%] rounded-lg border-2 border-app-surface/80"
            />
          </div>
          {error ? (
            <Alert tone="danger" role="alert">
              {error}
            </Alert>
          ) : (
            <p role="status" aria-live="polite" className="text-sm font-medium text-app-fg-muted">
              {statusText}
            </p>
          )}
        </div>
      )}
    </Dialog>
  );
}
