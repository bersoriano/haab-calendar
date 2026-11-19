"use client";

import { useEffect, useState } from "react";
import { formatDepositAmountInput } from "@/lib/bank-deposit";
import type { BankDepositAccount } from "@/lib/bank-deposit-settings";
import type { Lang } from "@/lib/types";
import { Alert, Button, Field, Input, Switch, Textarea } from "@/components/app-ui";

type ServiceDeposit = {
  id: string;
  name: string;
  deposit_required: boolean;
  deposit_amount_minor: number | null;
  deposit_currency_code: string | null;
};
type ServiceDraft = ServiceDeposit & { amount: string };

const emptyAccount: BankDepositAccount = {
  enabled: false,
  bankName: "",
  accountHolder: "",
  countryCode: "",
  currencyCode: "",
  accountNumber: "",
  clabe: "",
  iban: "",
  swiftBic: "",
  routingCode: "",
  instructionsEn: "",
  instructionsEs: "",
};

const labels = {
  en: {
    title: "Bank deposit receipts",
    intro: "Customers upload a receipt before booking. You confirm payment after checking your bank account.",
    enabled: "Accept bank deposit receipts",
    bank: "Bank name",
    holder: "Account holder",
    country: "Country code",
    currency: "Currency code",
    account: "Account number",
    clabe: "CLABE",
    iban: "IBAN",
    swift: "SWIFT / BIC",
    routing: "Routing code",
    instructionsEn: "Instructions in English",
    instructionsEs: "Instructions in Spanish",
    saveAccount: "Save bank details",
    services: "Services requiring a receipt",
    serviceHint: "Enter the exact full amount. Existing display price remains separate.",
    amount: "Deposit amount",
    saveService: "Save service",
    loading: "Loading bank deposit settings…",
    loadError: "Could not load bank deposit settings.",
    saved: "Bank deposit settings saved.",
    firstSave: "Save enabled bank details before enabling a service.",
    noServices: "Add a service before enabling deposits.",
  },
  es: {
    title: "Comprobantes de depósito bancario",
    intro: "El cliente sube un comprobante antes de reservar. Usted confirma el pago tras revisar su cuenta bancaria.",
    enabled: "Aceptar comprobantes de depósito",
    bank: "Banco",
    holder: "Titular de la cuenta",
    country: "Código de país",
    currency: "Código de moneda",
    account: "Número de cuenta",
    clabe: "CLABE",
    iban: "IBAN",
    swift: "SWIFT / BIC",
    routing: "Código de ruta bancaria",
    instructionsEn: "Instrucciones en inglés",
    instructionsEs: "Instrucciones en español",
    saveAccount: "Guardar datos bancarios",
    services: "Servicios que requieren comprobante",
    serviceHint: "Ingrese el importe total exacto. El precio mostrado se mantiene por separado.",
    amount: "Importe del depósito",
    saveService: "Guardar servicio",
    loading: "Cargando ajustes de depósitos…",
    loadError: "No se pudieron cargar los ajustes de depósitos.",
    saved: "Ajustes de depósitos guardados.",
    firstSave: "Guarde los datos bancarios activos antes de habilitar un servicio.",
    noServices: "Agregue un servicio antes de habilitar depósitos.",
  },
} as const;

export function BankDepositSettings({ lang, disabled = false }: { lang: Lang; disabled?: boolean }) {
  const t = labels[lang];
  const [account, setAccount] = useState<BankDepositAccount>(emptyAccount);
  const [savedAccountEnabled, setSavedAccountEnabled] = useState(false);
  const [services, setServices] = useState<ServiceDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void fetch("/api/provider/bank-deposit", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.userMessage ?? t.loadError);
        return body as { account: BankDepositAccount | null; services: ServiceDeposit[] };
      })
      .then((body) => {
        if (!live) return;
        const nextAccount = body.account ?? emptyAccount;
        setAccount(nextAccount);
        setSavedAccountEnabled(nextAccount.enabled);
        setServices(body.services.map((service) => ({
          ...service,
          amount: service.deposit_amount_minor === null || !service.deposit_currency_code
            ? ""
            : formatDepositAmountInput(service.deposit_amount_minor, service.deposit_currency_code),
        })));
      })
      .catch((cause) => { if (live) setError(cause instanceof Error ? cause.message : t.loadError); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [t.loadError]);

  function updateAccount<K extends keyof BankDepositAccount>(key: K, value: BankDepositAccount[K]) {
    setAccount((current) => ({ ...current, [key]: value }));
    setMessage(null);
  }

  async function saveAccount() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/provider/bank-deposit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(account),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.userMessage ?? t.loadError);
      setAccount(body.account as BankDepositAccount);
      setSavedAccountEnabled(Boolean(body.account?.enabled));
      setMessage(t.saved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.loadError);
    } finally {
      setSaving(false);
    }
  }

  function updateService(id: string, change: Partial<ServiceDraft>) {
    setServices((current) => current.map((service) => service.id === id ? { ...service, ...change } : service));
    setMessage(null);
  }

  async function saveService(service: ServiceDraft) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/provider/bank-deposit", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: service.id, enabled: service.deposit_required, amount: service.amount }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.userMessage ?? t.loadError);
      updateService(service.id, body.service as ServiceDeposit);
      setMessage(t.saved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.loadError);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p role="status" className="text-sm text-app-fg-muted">{t.loading}</p>;
  return (
    <section className="grid gap-6" aria-label={t.title}>
      <div>
        <h3 className="text-lg font-semibold text-app-fg">{t.title}</h3>
        <p className="text-sm text-app-fg-muted">{t.intro}</p>
      </div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {message ? <p role="status" className="text-sm text-app-accent">{message}</p> : null}
      <Field label={t.enabled} inline>
        <Switch checked={account.enabled} disabled={disabled || saving}
          onChange={(event) => updateAccount("enabled", event.target.checked)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.bank}><Input value={account.bankName} disabled={disabled || saving} onChange={(event) => updateAccount("bankName", event.target.value)} /></Field>
        <Field label={t.holder}><Input value={account.accountHolder} disabled={disabled || saving} onChange={(event) => updateAccount("accountHolder", event.target.value)} /></Field>
        <Field label={t.country}><Input value={account.countryCode} maxLength={2} autoCapitalize="characters" disabled={disabled || saving} onChange={(event) => updateAccount("countryCode", event.target.value.toUpperCase())} placeholder="MX" /></Field>
        <Field label={t.currency}><Input value={account.currencyCode} maxLength={3} autoCapitalize="characters" disabled={disabled || saving} onChange={(event) => updateAccount("currencyCode", event.target.value.toUpperCase())} placeholder="MXN" /></Field>
        <Field label={t.account}><Input value={account.accountNumber} disabled={disabled || saving} onChange={(event) => updateAccount("accountNumber", event.target.value)} /></Field>
        <Field label={t.clabe}><Input value={account.clabe} disabled={disabled || saving} onChange={(event) => updateAccount("clabe", event.target.value)} /></Field>
        <Field label={t.iban}><Input value={account.iban} disabled={disabled || saving} onChange={(event) => updateAccount("iban", event.target.value)} /></Field>
        <Field label={t.swift}><Input value={account.swiftBic} disabled={disabled || saving} onChange={(event) => updateAccount("swiftBic", event.target.value)} /></Field>
        <Field label={t.routing}><Input value={account.routingCode} disabled={disabled || saving} onChange={(event) => updateAccount("routingCode", event.target.value)} /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.instructionsEn}><Textarea value={account.instructionsEn} rows={3} disabled={disabled || saving} onChange={(event) => updateAccount("instructionsEn", event.target.value)} /></Field>
        <Field label={t.instructionsEs}><Textarea value={account.instructionsEs} rows={3} disabled={disabled || saving} onChange={(event) => updateAccount("instructionsEs", event.target.value)} /></Field>
      </div>
      <div><Button disabled={disabled || saving} onClick={() => void saveAccount()}>{t.saveAccount}</Button></div>
      <div className="border-t border-app-border pt-5">
        <h4 className="font-semibold text-app-fg">{t.services}</h4>
        <p className="text-sm text-app-fg-muted">{t.serviceHint}</p>
      </div>
      {services.length === 0 ? <p className="text-sm text-app-fg-muted">{t.noServices}</p> : null}
      {services.map((service) => (
        <div key={service.id} className="grid gap-3 rounded-xl border border-app-border bg-app-surface p-4 sm:grid-cols-[1fr_auto]">
          <div className="grid gap-3">
            <p className="font-semibold text-app-fg">{service.name}</p>
            <Field label={t.enabled} inline>
              <Switch checked={service.deposit_required} disabled={disabled || saving || !savedAccountEnabled}
                onChange={(event) => updateService(service.id, { deposit_required: event.target.checked })} />
            </Field>
            {service.deposit_required ? (
              <Field label={`${t.amount} (${account.currencyCode})`}>
                <Input value={service.amount} inputMode="decimal" disabled={disabled || saving}
                  onChange={(event) => updateService(service.id, { amount: event.target.value })} placeholder="1250.00" />
              </Field>
            ) : null}
          </div>
          <div className="self-end"><Button disabled={disabled || saving || (service.deposit_required && !savedAccountEnabled)}
            onClick={() => void saveService(service)}>{t.saveService}</Button></div>
        </div>
      ))}
      {!savedAccountEnabled ? <p className="text-sm text-app-fg-muted">{t.firstSave}</p> : null}
    </section>
  );
}
