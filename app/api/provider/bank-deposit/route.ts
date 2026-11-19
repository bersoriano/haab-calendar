import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseDepositAmountMinor } from "@/lib/bank-deposit";
import { isEligibleDepositBusiness, validateBankDepositAccount } from "@/lib/bank-deposit-settings";
import { createClient } from "@/lib/supabase/server";
import type { RsvpMode, VerticalId } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProviderRow = { id: string; vertical: VerticalId; rsvp_mode: RsvpMode | null };
type BankRow = {
  provider_id: string;
  enabled: boolean;
  bank_name: string;
  account_holder: string;
  country_code: string;
  currency_code: string;
  account_number: string | null;
  clabe: string | null;
  iban: string | null;
  swift_bic: string | null;
  routing_code: string | null;
  instructions_en: string;
  instructions_es: string;
};

function toAccount(row: BankRow) {
  return {
    enabled: row.enabled,
    bankName: row.bank_name,
    accountHolder: row.account_holder,
    countryCode: row.country_code,
    currencyCode: row.currency_code,
    accountNumber: row.account_number ?? "",
    clabe: row.clabe ?? "",
    iban: row.iban ?? "",
    swiftBic: row.swift_bic ?? "",
    routingCode: row.routing_code ?? "",
    instructionsEn: row.instructions_en,
    instructionsEs: row.instructions_es,
  };
}

async function ownerContext(): Promise<
  | { ok: true; client: SupabaseClient; provider: ProviderRow }
  | { ok: false; error: NextResponse }
> {
  const client = await createClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return { ok: false, error: NextResponse.json(
    { userMessage: "Sign in to manage bank deposits." }, { status: 401 },
  ) };

  const { data: provider, error } = await client.from("providers")
    .select("id, vertical, rsvp_mode")
    .eq("owner_user_id", user.id)
    .maybeSingle<ProviderRow>();
  if (error) return { ok: false, error: NextResponse.json(
    { userMessage: "Could not load your business." }, { status: 500 },
  ) };
  if (!provider) return { ok: false, error: NextResponse.json(
    { userMessage: "Business not found." }, { status: 404 },
  ) };
  return { ok: true, client, provider };
}

export async function GET() {
  const context = await ownerContext();
  if (!context.ok) return context.error;
  const { client, provider } = context;
  if (!isEligibleDepositBusiness(provider.vertical, provider.rsvp_mode ?? undefined)) {
    return NextResponse.json({ userMessage: "Bank deposits are unavailable for this business type." }, { status: 403 });
  }
  const [accountResult, servicesResult] = await Promise.all([
    client.from("business_bank_accounts").select("*").eq("provider_id", provider.id).maybeSingle<BankRow>(),
    client.from("services")
      .select("id, name, deposit_required, deposit_amount_minor, deposit_currency_code")
      .eq("provider_id", provider.id),
  ]);
  if (accountResult.error || servicesResult.error) {
    return NextResponse.json({ userMessage: "Could not load bank deposit settings." }, { status: 500 });
  }
  return NextResponse.json({
    account: accountResult.data ? toAccount(accountResult.data) : null,
    services: servicesResult.data ?? [],
  });
}

export async function PUT(request: NextRequest) {
  const context = await ownerContext();
  if (!context.ok) return context.error;
  const { client, provider } = context;
  if (!isEligibleDepositBusiness(provider.vertical, provider.rsvp_mode ?? undefined)) {
    return NextResponse.json({ userMessage: "Bank deposits are unavailable for this business type." }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ userMessage: "Invalid bank deposit request." }, { status: 400 });
  }
  const validated = validateBankDepositAccount(body);
  if (!validated.ok) {
    return NextResponse.json({ userMessage: validated.message }, { status: 400 });
  }
  const account = validated.account;
  const { data: current, error: currentError } = await client.from("business_bank_accounts")
    .select("currency_code")
    .eq("provider_id", provider.id)
    .maybeSingle<Pick<BankRow, "currency_code">>();
  if (currentError) {
    return NextResponse.json({ userMessage: "Could not load current bank settings." }, { status: 500 });
  }
  if (!account.enabled || (current && current.currency_code !== account.currencyCode)) {
    const { data: active, error: activeError } = await client.from("services")
      .select("id")
      .eq("provider_id", provider.id)
      .eq("deposit_required", true)
      .limit(1);
    if (activeError) {
      return NextResponse.json({ userMessage: "Could not check deposit services." }, { status: 500 });
    }
    if (active?.length) {
      return NextResponse.json({ userMessage: "Disable deposits on all services before changing currency or bank availability." }, { status: 409 });
    }
  }

  const payload = {
    provider_id: provider.id,
    enabled: account.enabled,
    bank_name: account.bankName,
    account_holder: account.accountHolder,
    country_code: account.countryCode,
    currency_code: account.currencyCode,
    account_number: account.accountNumber || null,
    clabe: account.clabe || null,
    iban: account.iban || null,
    swift_bic: account.swiftBic || null,
    routing_code: account.routingCode || null,
    instructions_en: account.instructionsEn,
    instructions_es: account.instructionsEs,
  };
  const { data, error } = await client.from("business_bank_accounts")
    .upsert(payload, { onConflict: "provider_id" })
    .select("*")
    .single<BankRow>();
  if (error) {
    return NextResponse.json({ userMessage: "Could not save bank deposit settings." }, { status: 500 });
  }
  return NextResponse.json({ account: toAccount(data) });
}

export async function PATCH(request: NextRequest) {
  const context = await ownerContext();
  if (!context.ok) return context.error;
  const { client, provider } = context;
  if (!isEligibleDepositBusiness(provider.vertical, provider.rsvp_mode ?? undefined)) {
    return NextResponse.json({ userMessage: "Bank deposits are unavailable for this business type." }, { status: 403 });
  }

  let body: { serviceId?: unknown; enabled?: unknown; amount?: unknown };
  try { body = await request.json(); } catch {
    return NextResponse.json({ userMessage: "Invalid service deposit request." }, { status: 400 });
  }
  if (typeof body.serviceId !== "string" || !body.serviceId.trim() || typeof body.enabled !== "boolean") {
    return NextResponse.json({ userMessage: "Choose a service and deposit setting." }, { status: 400 });
  }

  let payload: Record<string, unknown> = { deposit_required: false };
  if (body.enabled) {
    const { data: account, error } = await client.from("business_bank_accounts")
      .select("enabled, currency_code")
      .eq("provider_id", provider.id)
      .maybeSingle<Pick<BankRow, "enabled" | "currency_code">>();
    if (error) {
      return NextResponse.json({ userMessage: "Could not check bank details." }, { status: 500 });
    }
    if (!account?.enabled) {
      return NextResponse.json({ userMessage: "Save enabled bank details first." }, { status: 409 });
    }
    const amount = typeof body.amount === "string"
      ? parseDepositAmountMinor(body.amount.trim(), account.currency_code)
      : null;
    if (amount === null) {
      return NextResponse.json({ userMessage: "Enter a valid positive price in bank currency." }, { status: 400 });
    }
    payload = {
      deposit_required: true,
      deposit_amount_minor: amount,
      deposit_currency_code: account.currency_code,
    };
  }

  const { data, error } = await client.from("services")
    .update(payload)
    .eq("id", body.serviceId.trim())
    .eq("provider_id", provider.id)
    .select("id, deposit_required, deposit_amount_minor, deposit_currency_code")
    .maybeSingle();
  if (error) {
    return NextResponse.json({ userMessage: "Could not save service deposit settings." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ userMessage: "Service not found." }, { status: 404 });
  }
  return NextResponse.json({ service: data });
}
