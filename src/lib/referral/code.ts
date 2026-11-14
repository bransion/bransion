// =====================================================================
// BRANSION — Referral code generation & validation.
// Format: BRN-XXXX-YY where X/Y are uppercase alphanumeric.
// =====================================================================

const REFERRAL_CODE_RE = /^BRN-[A-Z0-9]{4}-[A-Z0-9]{2}$/;

export function generateReferralCode(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const part1 = Array.from(bytes.slice(0, 4))
    .map((b) => alphabet[b % alphabet.length])
    .join('');
  const part2 = Array.from(bytes.slice(4, 6))
    .map((b) => alphabet[b % alphabet.length])
    .join('');
  return `BRN-${part1}-${part2}`;
}

export function validateReferralCodeFormat(code: string | null | undefined): boolean {
  if (!code || typeof code !== 'string') return false;
  return REFERRAL_CODE_RE.test(code);
}