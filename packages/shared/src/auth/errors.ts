import type { AuthErrorMessages } from "../i18n/types";

/**
 * Maps a Supabase Auth `error_code` (AuthError.code) to the key of the user-facing message.
 * Wrong password and unknown email deliberately share `invalid_credentials` — Supabase
 * doesn't reveal whether an account exists, and neither do we.
 */
const CODE_TO_MESSAGE: Record<string, keyof AuthErrorMessages> = {
  invalid_credentials: "invalidCredentials",
  email_not_confirmed: "emailNotConfirmed",
  weak_password: "weakPassword",
  email_address_invalid: "invalidEmail",
  validation_failed: "invalidEmail",
  user_already_exists: "userAlreadyExists",
  email_exists: "userAlreadyExists",
  over_request_rate_limit: "rateLimited",
  over_email_send_rate_limit: "rateLimited",
  same_password: "samePassword",
  session_not_found: "sessionMissing",
};

export function authErrorKey(code: string | undefined | null): keyof AuthErrorMessages {
  return (code && CODE_TO_MESSAGE[code]) || "generic";
}
