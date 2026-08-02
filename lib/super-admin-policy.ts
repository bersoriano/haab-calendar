export const SUPER_ADMIN_EMAIL = "bsorianodev@gmail.com";

export function isSuperAdminEmail(email?: string | null) {
  return email?.trim().toLowerCase() === SUPER_ADMIN_EMAIL;
}
