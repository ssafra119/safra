import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePhone,
  phoneToAuthEmail,
  toFirebaseAuthPassword,
  generateSixDigitPin,
  isSubscriptionActive,
  getRemainingDays,
  getAccountStatus,
  checkDeviceAccess,
  buildRepWhatsAppMessage,
  filterUserAccounts,
  normalizeAdminUsername,
  adminUsernameToEmail,
  validateCompanyAdminCredentials,
} from './subscription.ts';
import { getCatalogPublicUrl, resolveAppRoute } from './routes.ts';
import type { UserAccount } from '../types.ts';

test('normalizePhone and phoneToAuthEmail clean Kurdish/Arabic digits and formatting', () => {
  assert.equal(normalizePhone('0750 710-0238'), '07507100238');
  assert.equal(normalizePhone('٠٧٥٠ ٧١٠ ٠٢٣٨'), '07507100238');
  assert.equal(phoneToAuthEmail('0750 710 0238'), '07507100238@safra.app');
  assert.equal(phoneToAuthEmail(''), '');
});

test('toFirebaseAuthPassword wraps short secrets like "1" and preserves >= 6 char secrets', () => {
  assert.equal(toFirebaseAuthPassword('1'), 'safra#1');
  assert.equal(toFirebaseAuthPassword('١'), 'safra#1');
  assert.equal(toFirebaseAuthPassword('1234'), 'safra#1234');
  assert.equal(toFirebaseAuthPassword('123456'), '123456');
  assert.equal(toFirebaseAuthPassword('safra2025'), 'safra2025');
  assert.equal(toFirebaseAuthPassword(''), '');
});

test('generateSixDigitPin generates 6-digit numeric strings', () => {
  for (let i = 0; i < 20; i++) {
    const pin = generateSixDigitPin();
    assert.match(pin, /^\d{6}$/);
    const n = Number(pin);
    assert.ok(n >= 100000 && n <= 999999);
  }
});

test('subscription status, expiry, and remaining days calculations', () => {
  const now = 1_700_000_000_000;
  const fiveDaysLater = now + 5 * 86_400_000;
  const oneHourAgo = now - 3_600_000;

  assert.equal(isSubscriptionActive({ active: true, expiresAtMs: fiveDaysLater }, now), true);
  assert.equal(isSubscriptionActive({ active: false, expiresAtMs: fiveDaysLater }, now), false);
  assert.equal(isSubscriptionActive({ active: true, expiresAtMs: oneHourAgo }, now), false);

  assert.equal(getRemainingDays(fiveDaysLater, now), 5);
  assert.equal(getRemainingDays(oneHourAgo, now), 0);

  assert.equal(getAccountStatus({ active: true, expiresAtMs: fiveDaysLater }, now), 'active');
  assert.equal(getAccountStatus({ active: false, expiresAtMs: fiveDaysLater }, now), 'blocked');
  assert.equal(getAccountStatus({ active: true, expiresAtMs: oneHourAgo }, now), 'expired');
});

test('checkDeviceAccess enforces 1-device-only lock for reps and multi-device for admins', () => {
  assert.deepEqual(checkDeviceAccess({ role: 'rep', deviceId: null }, 'dev-1'), {
    allowed: true,
    needsBind: true,
  });
  assert.deepEqual(checkDeviceAccess({ role: 'rep', deviceId: 'dev-1' }, 'dev-1'), {
    allowed: true,
    needsBind: false,
  });
  assert.deepEqual(checkDeviceAccess({ role: 'rep', deviceId: 'dev-1' }, 'dev-2'), {
    allowed: false,
    needsBind: false,
  });
  assert.deepEqual(checkDeviceAccess({ role: 'superadmin', deviceId: 'dev-1' }, 'dev-2'), {
    allowed: true,
    needsBind: false,
  });
});

test('buildRepWhatsAppMessage formats Badini Kurdish onboarding details with English digits', () => {
  const msg = buildRepWhatsAppMessage({
    appUrl: 'https://safra.app',
    name: 'ئومێد',
    phone: '0750 123 4567',
    pin: '654321',
    durationDays: 30,
  });
  assert.ok(msg.includes('https://safra.app'));
  assert.ok(msg.includes('07501234567'));
  assert.ok(msg.includes('654321'));
  assert.ok(msg.includes('30 ڕۆژ'));
});

test('filterUserAccounts filters by search query and account status', () => {
  const now = 1_700_000_000_000;
  const accounts: UserAccount[] = [
    {
      uid: 'u1',
      name: 'ئەحمەد دهۆکی',
      phone: '07501112233',
      notes: 'دهۆک',
      role: 'rep',
      active: true,
      expiresAtMs: now + 10 * 86_400_000,
      deviceId: 'd1',
      createdAtMs: now,
      lastLoginAtMs: now,
    },
    {
      uid: 'u2',
      name: 'هەڤاڵ زاخۆیی',
      phone: '07504445566',
      notes: 'زاخۆ',
      role: 'rep',
      active: false,
      expiresAtMs: now + 10 * 86_400_000,
      deviceId: null,
      createdAtMs: now,
      lastLoginAtMs: null,
    },
    {
      uid: 'u3',
      name: 'سەردار هەولێری',
      phone: '07507778899',
      notes: 'هەولێر',
      role: 'rep',
      active: true,
      expiresAtMs: now - 1000,
      deviceId: 'd3',
      createdAtMs: now,
      lastLoginAtMs: now,
    },
  ];

  assert.equal(filterUserAccounts(accounts, '', 'all', now).length, 3);
  assert.equal(filterUserAccounts(accounts, '', 'active', now).length, 1);
  assert.equal(filterUserAccounts(accounts, '', 'blocked', now).length, 1);
  assert.equal(filterUserAccounts(accounts, '', 'expired', now).length, 1);
  assert.equal(filterUserAccounts(accounts, 'زاخۆ', 'all', now)[0].uid, 'u2');
  assert.equal(filterUserAccounts(accounts, '0750777', 'all', now)[0].uid, 'u3');
});

test('company admin username normalization and validation helpers work cleanly', () => {
  assert.equal(normalizeAdminUsername(' Safra_Admin 12 '), 'safra_admin12');
  assert.equal(adminUsernameToEmail('Safra'), 'safra@admin.safra.app');
  assert.equal(adminUsernameToEmail('ab'), '');

  assert.equal(validateCompanyAdminCredentials('ab', '123456').valid, false);
  assert.equal(validateCompanyAdminCredentials('safra', '').valid, false);
  assert.equal(validateCompanyAdminCredentials('safra', '1').valid, true);
  assert.deepEqual(validateCompanyAdminCredentials('Safra', '123456'), {
    valid: true,
    cleanUsername: 'safra',
  });
});

test('resolveAppRoute and getCatalogPublicUrl work on both root and /safra/ subpath deployments', () => {
  assert.equal(resolveAppRoute('catalog', '/'), './');
  assert.equal(resolveAppRoute('catalog', '/safra/'), './');
  assert.equal(resolveAppRoute('catalog', '/safra/admin.html'), './');
  assert.equal(resolveAppRoute('catalog', '/safra/admin/'), '../');
  assert.equal(resolveAppRoute('catalog', '/accounts/'), '../');
  assert.equal(resolveAppRoute('admin', '/safra/accounts.html'), './admin.html');
  assert.equal(resolveAppRoute('admin', '/safra/accounts/'), '../admin.html');

  assert.equal(
    getCatalogPublicUrl('https://ssafra119.github.io/safra/accounts.html'),
    'https://ssafra119.github.io/safra/'
  );
  assert.equal(
    getCatalogPublicUrl('https://ssafra119.github.io/safra/accounts/'),
    'https://ssafra119.github.io/safra/'
  );
  assert.equal(
    getCatalogPublicUrl('https://example.com/accounts'),
    'https://example.com/'
  );
});
