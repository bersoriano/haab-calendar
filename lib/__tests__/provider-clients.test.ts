import { describe, expect, it } from "vitest";

import {
  clientsCsvFileName,
  filterClients,
  toClientsCsv,
  type ProviderClient,
} from "@/lib/provider-clients";

const ANA: ProviderClient = {
  id: "1",
  name: "Ana Peña",
  email: "ana@example.com",
  phone: "+52 55 1234 5678",
  firstBookedAt: "2026-01-15T18:00:00.000Z",
  lastBookedAt: "2026-03-02T18:00:00.000Z",
  bookingCount: 3,
};

function csvLines(client: Partial<ProviderClient>) {
  return toClientsCsv([{ ...ANA, ...client }], { lang: "en", timeZone: "UTC" })
    .replace(/^﻿/, "")
    .split("\r\n");
}

describe("toClientsCsv", () => {
  it("starts with a byte-order mark, so Excel reads accents correctly", () => {
    expect(toClientsCsv([], { lang: "en" }).startsWith("﻿")).toBe(true);
  });

  it("writes a header in the provider's language and one row per client", () => {
    const csv = toClientsCsv([ANA], { lang: "es", timeZone: "UTC" });

    expect(csv).toBe(
      "﻿Nombre,Correo electrónico,Teléfono,Primera reserva,Última reserva,Reservas\r\n" +
        "Ana Peña,ana@example.com,+52 55 1234 5678,2026-01-15,2026-03-02,3\r\n",
    );
  });

  it("gives dates in the provider's time zone", () => {
    const [, row] = toClientsCsv(
      [{ ...ANA, lastBookedAt: "2026-03-03T02:00:00.000Z" }],
      { lang: "en", timeZone: "America/Mexico_City" },
    ).split("\r\n");

    expect(row).toContain(",2026-03-02,3");
  });

  it("quotes commas, quotes and line breaks", () => {
    expect(csvLines({ name: 'Peña, "Ana"' })[1]).toMatch(/^"Peña, ""Ana""",/);
    expect(csvLines({ name: "Ana\nPeña" }).slice(1).join("|")).toContain('"Ana\nPeña"');
  });

  it.each([
    ["=HYPERLINK(\"http://evil.example\")"],
    ["+1+1"],
    ["-2+3"],
    ["@SUM(A1)"],
    ["\t=1+1"],
    [" =1+1"],
    ["＝1+1"],
  ])("stops %j running as a formula", (name) => {
    const row = csvLines({ name })[1];

    expect(row.replace(/^"/, "")).toMatch(/^'/);
  });

  it("neutralizes a formula in the phone and email too", () => {
    expect(csvLines({ phone: "=1+1" })[1]).toContain(",'=1+1,");
    expect(csvLines({ email: "=1+1@example.com" })[1]).toContain(",'=1+1@example.com,");
  });

  it("leaves a real international phone number as typed", () => {
    expect(csvLines({ phone: "+52 (55) 1234-5678" })[1]).toContain(",+52 (55) 1234-5678,");
  });
});

describe("clientsCsvFileName", () => {
  it("names the file for the language and the provider's day", () => {
    const lateAtNight = new Date("2026-03-03T02:00:00.000Z");

    expect(clientsCsvFileName("en", "America/Mexico_City", lateAtNight)).toBe("clients-2026-03-02.csv");
    expect(clientsCsvFileName("es", "UTC", lateAtNight)).toBe("clientes-2026-03-03.csv");
  });
});

describe("filterClients", () => {
  const LEO = { ...ANA, id: "2", name: "Leo Ruiz", email: "leo@example.com", phone: "" };

  it("finds someone by name, email or phone, ignoring case", () => {
    expect(filterClients([ANA, LEO], "PEÑA")).toEqual([ANA]);
    expect(filterClients([ANA, LEO], "leo@")).toEqual([LEO]);
    expect(filterClients([ANA, LEO], "1234")).toEqual([ANA]);
  });

  it("returns everyone for a blank search", () => {
    expect(filterClients([ANA, LEO], "  ")).toEqual([ANA, LEO]);
  });
});
