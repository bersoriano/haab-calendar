import { describe, expect, it } from "vitest";

import {
  getAuthCopy,
  getAuthErrorMessage,
  withAuthReturnLanguage,
} from "@/lib/auth-i18n";
import { getAuthReturnVertical } from "@/lib/auth-vertical";

describe("auth i18n", () => {
  it("normalizes the requested login language", () => {
    expect(getAuthCopy("en").lang).toBe("en");
    expect(getAuthCopy("es").t.signIn).toBe("Iniciar sesión");
    expect(getAuthCopy(null).lang).toBe("en");
  });

  it("keeps the selected language in the post-authentication return path", () => {
    expect(withAuthReturnLanguage("/", "es")).toBe("/?lang=es");
    expect(withAuthReturnLanguage("/?vertical=healthcare", "es")).toBe(
      "/?vertical=healthcare&lang=es",
    );
    expect(withAuthReturnLanguage("/?vertical=events#setup", "en")).toBe(
      "/?vertical=events&lang=en#setup",
    );
  });

  it("recognizes the events vertical in the authentication return path", () => {
    expect(getAuthReturnVertical("/?vertical=events&lang=es#setup")).toBe("events");
    expect(getAuthReturnVertical("/?vertical=healthcare")).toBe("healthcare");
    expect(getAuthReturnVertical("/?vertical=unknown")).toBeUndefined();
  });

  it("maps known Supabase auth errors to Spanish", () => {
    expect(
      getAuthErrorMessage(
        { code: "invalid_credentials", message: "Invalid login credentials" },
        "es",
        "signInFailed",
      ),
    ).toBe("El correo o la contraseña son incorrectos.");
    expect(
      getAuthErrorMessage(
        { code: "user_already_exists" },
        "es",
        "createFailed",
      ),
    ).toBe("Ya existe una cuenta con este correo electrónico.");
  });

  it("uses a localized fallback for unknown Spanish errors", () => {
    expect(
      getAuthErrorMessage(
        { code: "unexpected", message: "Internal English detail" },
        "es",
        "createFailed",
      ),
    ).toBe("No se pudo crear la cuenta.");
  });

  it("preserves the existing detailed English Supabase message", () => {
    expect(
      getAuthErrorMessage(
        { code: "invalid_credentials", message: "Invalid login credentials" },
        "en",
        "signInFailed",
      ),
    ).toBe("Invalid login credentials");
  });
});
