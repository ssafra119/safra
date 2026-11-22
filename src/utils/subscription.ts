import type { UserAccount } from '../types.ts';
import { normalizeEnglishDigits } from './stock.ts';

/**
 * Normalizes a phone number by converting Arabic/Kurdish numerals to English
 * and keeping only digits.
 */
export function normalizePhone(raw: string): string {
  return normalizeEnglishDigits(String(raw ?? '')).replace(/[^0-9]/g, '');
}

/**
 * Maps a cleaned phone number to a deterministic Firebase Auth email.
 */
export function phoneToAuthEmail(phone: string): string {
  const clean = normalizePhone(phone);
  if (!clean) return '';
  return `${clean}@safra.app`;
}

/**
 * Normalizes a PIN or password (including Kurdish/Arabic digits) and transparently
 * wraps short secrets (< 6 chars, e.g. "1") so Firebase Auth accepts them seamlessly
 * while keeping >= 6 char secrets unchanged for full backwards compatibility.
 */
export function toFirebaseAuthPassword(rawSecret: string): string {
  const normalized = normalizeEnglishDigits(String(rawSecret ?? '')).trim();
  if (!normalized) return '';
  if (normalized.length >= 6) {
    return normalized;
  }
  return `safra#${normalized}`;
}

/**
 * Generates a random 6-digit PIN string (100000 - 999999).
 */
export function generateSixDigitPin(): string {
  const arr = new Uint32Array(1);
  globalThis.crypto.getRandomValues(arr);
  const num = 100000 + (arr[0] % 900000);
  return String(num);
}

/**
 * Checks if a user's subscription is currently active and unexpired.
 */
export function isSubscriptionActive(
  user: Pick<UserAccount, 'active' | 'expiresAtMs'> | null | undefined,
  nowMs: number = Date.now()
): boolean {
  if (!user) return false;
  return user.active === true && Number.isFinite(user.expiresAtMs) && user.expiresAtMs > nowMs;
}

/**
 * Computes remaining subscription days (0 if expired).
 */
export function getRemainingDays(expiresAtMs: number, nowMs: number = Date.now()): number {
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs) return 0;
  return Math.ceil((expiresAtMs - nowMs) / 86_400_000);
}

/**
 * Computes high-level account status for Super Admin management UI.
 */
export function getAccountStatus(
  user: Pick<UserAccount, 'active' | 'expiresAtMs'>,
  nowMs: number = Date.now()
): 'active' | 'blocked' | 'expired' {
  if (!user.active) return 'blocked';
  if (!Number.isFinite(user.expiresAtMs) || user.expiresAtMs <= nowMs) return 'expired';
  return 'active';
}

/**
 * Enforces strict 1-device-only lock for sales reps ('rep').
 * Admins and superadmins can access from multiple devices.
 */
export function checkDeviceAccess(
  user: Pick<UserAccount, 'role' | 'deviceId'>,
  currentDeviceId: string
): { allowed: boolean; needsBind: boolean } {
  if (user.role === 'admin' || user.role === 'superadmin') {
    return { allowed: true, needsBind: false };
  }

  const bound = (user.deviceId || '').trim();
  if (!bound) {
    return { allowed: true, needsBind: true };
  }

  if (bound === currentDeviceId) {
    return { allowed: true, needsBind: false };
  }

  return { allowed: false, needsBind: false };
}

/**
 * Formats a Badini Kurdish WhatsApp onboarding message with English numerals.
 */
export function buildRepWhatsAppMessage(params: {
  appUrl: string;
  name: string;
  phone: string;
  pin: string;
  durationDays: number;
}): string {
  const cleanPhone = normalizePhone(params.phone);
  const cleanPin = normalizeEnglishDigits(params.pin).trim();
  const safeDays = Math.max(1, Math.floor(Number(params.durationDays) || 30));

  return [
    `سڵاڤ ${params.name}، بەخێرهاتی بۆ سیستەمێ کەتەلۆگێ سەفرا (SAFRA).`,
    `لینکێ بەرنامەی: ${params.appUrl}`,
    `ژمارەیا موبایلێ: ${cleanPhone}`,
    `کۆدێ نهێنی (PIN): ${cleanPin}`,
    `ماوێ بەشداریێ: ${safeDays} ڕۆژ`,
    `تێبینی: ئەڤ حسابە بتنێ ل سەر ئێک موبایل کار دکەت.`,
  ].join('\n');
}

/**
 * Filters accounts by search text (name, phone, notes) and status filter.
 */
export function filterUserAccounts(
  accounts: UserAccount[],
  searchQuery: string,
  statusFilter: 'all' | 'active' | 'blocked' | 'expired',
  nowMs: number = Date.now()
): UserAccount[] {
  const query = normalizeEnglishDigits((searchQuery || '').trim().toLowerCase());

  return accounts.filter((acc) => {
    if (statusFilter !== 'all') {
      if (getAccountStatus(acc, nowMs) !== statusFilter) {
        return false;
      }
    }

    if (query) {
      const matchName = acc.name.toLowerCase().includes(query);
      const matchPhone = normalizePhone(acc.phone).includes(query);
      const matchNotes = (acc.notes || '').toLowerCase().includes(query);
      if (!matchName && !matchPhone && !matchNotes) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Normalizes a company admin username to lowercase alphanumeric, dot, underscore, or hyphen.
 */
export function normalizeAdminUsername(raw: string): string {
  return normalizeEnglishDigits(String(raw ?? ''))
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '');
}

/**
 * Maps a normalized company admin username to its dedicated Firebase Auth email.
 */
export function adminUsernameToEmail(username: string): string {
  const clean = normalizeAdminUsername(username);
  if (clean.length < 3) return '';
  return `${clean}@admin.safra.app`;
}

/**
 * Validates company admin login / creation credentials.
 */
export function validateCompanyAdminCredentials(
  username: string,
  password: string
): { valid: boolean; cleanUsername: string; error?: string } {
  const cleanUsername = normalizeAdminUsername(username);
  if (cleanUsername.length < 3) {
    return {
      valid: false,
      cleanUsername,
      error: 'ناڤێ بەکارهێنەری پێتڤیە کێمترین 3 پیت یان ژمارەیێن ئینگلیزی بن',
    };
  }
  if (!password || password.trim().length < 1) {
    return {
      valid: false,
      cleanUsername,
      error: 'تکایە پاسوۆردی بنڤیسە',
    };
  }
  return { valid: true, cleanUsername };
}

