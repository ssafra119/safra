import { getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getAuth,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  getDocs,
  getFirestore,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import type { Category, Product, UserAccount, UserRole } from './types.ts';
import { normalizeEnglishDigits } from './utils/stock.ts';
import {
  adminUsernameToEmail,
  normalizePhone,
  phoneToAuthEmail,
  validateCompanyAdminCredentials,
} from './utils/subscription.ts';

// 1. Primary Firebase App (for / Sales Rep Catalog and /admin Company Warehouse)
export const app = getApps().find((a) => a.name === '[DEFAULT]') ?? initializeApp(firebaseConfig);

// CRITICAL: The app will break without specifying firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// 2. Isolated Super Admin Firebase App (exclusively for /accounts so sessions never collide)
export const superAdminApp =
  getApps().find((a) => a.name === 'SuperAdminApp') ??
  initializeApp(firebaseConfig, 'SuperAdminApp');
export const superDb = getFirestore(superAdminApp, firebaseConfig.firestoreDatabaseId);
export const superAuth = getAuth(superAdminApp);

// Configure permanent local persistence on both primary and superadmin auth instances
void setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Could not enforce browserLocalPersistence on auth:', err);
});
void setPersistence(superAuth, browserLocalPersistence).catch((err) => {
  console.warn('Could not enforce browserLocalPersistence on superAuth:', err);
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
  authInstance: Auth = auth
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: authInstance.currentUser?.uid,
      email: authInstance.currentUser?.email,
      emailVerified: authInstance.currentUser?.emailVerified,
      isAnonymous: authInstance.currentUser?.isAnonymous,
      tenantId: authInstance.currentUser?.tenantId,
      providerInfo:
        authInstance.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test helper as mandated by skill
export async function testConnection(targetDb: Firestore = db): Promise<boolean> {
  try {
    await getDocFromServer(doc(targetDb, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
      return false;
    }
    return true;
  }
}

// Sales Rep login: Phone + 6-digit PIN
export async function loginWithPhonePin(phone: string, pin: string): Promise<User> {
  const email = phoneToAuthEmail(phone);
  const cleanPin = normalizeEnglishDigits(pin).trim();
  if (!email) {
    throw new Error('INVALID_PHONE');
  }
  await setPersistence(auth, browserLocalPersistence);
  const result = await signInWithEmailAndPassword(auth, email, cleanPin);
  return result.user;
}

// Company Admin login (/admin): Username + Password
export async function loginCompanyAdmin(username: string, password: string): Promise<User> {
  const email = adminUsernameToEmail(username);
  if (!email) {
    throw new Error('INVALID_USERNAME');
  }
  await setPersistence(auth, browserLocalPersistence);
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

// Company Admin self-service display name & password update inside /admin
export async function updateCompanyAdminProfileAndPassword(params: {
  currentPassword: string;
  newPassword?: string;
  newDisplayName?: string;
}): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.email) {
    throw new Error('ناڤێ ئەدمینی نەهاتە دیتن، تکایە دوبارە بچۆ ژوور');
  }

  const credential = EmailAuthProvider.credential(currentUser.email, params.currentPassword);
  await reauthenticateWithCredential(currentUser, credential);

  if (params.newPassword && params.newPassword.trim().length > 0) {
    if (params.newPassword.length < 6) {
      throw new Error('پاسوۆردێ نووی پێتڤیە کێمترین 6 پیت یان ژمارە بن');
    }
    await updatePassword(currentUser, params.newPassword);
  }

  if (params.newDisplayName && params.newDisplayName.trim().length > 0) {
    const path = `users/${currentUser.uid}`;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        name: params.newDisplayName.trim().slice(0, 120),
        lastLoginAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path, auth);
    }
  }
}

// Primary Sign Out (Catalog / Company Admin)
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

// Super Admin Google Sign-In (/accounts isolated session)
export async function loginSuperAdminGoogle(): Promise<User> {
  await setPersistence(superAuth, browserLocalPersistence);
  const result = await signInWithPopup(superAuth, googleProvider);
  return result.user;
}

// Super Admin Sign Out (/accounts isolated session)
export async function logoutSuperAdmin(): Promise<void> {
  await signOut(superAuth);
}

// Parse Firestore users/{uid} document into UserAccount
export function parseFirestoreUserDoc(uid: string, data: Record<string, unknown>): UserAccount {
  const toMillis = (val: unknown, fallback = 0): number => {
    if (!val) return fallback;
    if (val instanceof Timestamp) return val.toMillis();
    if (typeof (val as { toMillis?: () => number }).toMillis === 'function') {
      return (val as { toMillis: () => number }).toMillis();
    }
    if (typeof val === 'string') {
      const parsed = Date.parse(val);
      return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
  };

  const role: UserRole =
    data.role === 'superadmin' || data.role === 'admin' || data.role === 'rep'
      ? data.role
      : 'rep';

  return {
    uid,
    name: typeof data.name === 'string' ? data.name : '',
    phone: typeof data.phone === 'string' ? data.phone : '',
    notes: typeof data.notes === 'string' ? data.notes : '',
    role,
    active: data.active === true,
    expiresAtMs: toMillis(data.expiresAt, 0),
    deviceId: typeof data.deviceId === 'string' && data.deviceId.trim().length > 0 ? data.deviceId : null,
    createdAtMs: toMillis(data.createdAt, Date.now()),
    lastLoginAtMs: data.lastLoginAt ? toMillis(data.lastLoginAt, Date.now()) : null,
  };
}

// Bootstrap verified owner email as superadmin in users/{uid}
export async function bootstrapSuperAdminProfile(
  user: User,
  targetDb: Firestore = superDb,
  authInstance: Auth = superAuth
): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    const tenYearsMs = Date.now() + 3650 * 86_400_000;
    await setDoc(doc(targetDb, 'users', user.uid), {
      name: user.displayName || 'Super Admin',
      phone: user.phoneNumber || '07507100238',
      notes: 'Super Admin',
      role: 'superadmin',
      active: true,
      expiresAt: Timestamp.fromMillis(tenYearsMs),
      deviceId: null,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path, authInstance);
  }
}

// Bind deviceId on first rep login (never overwrites an existing different deviceId)
export async function bindUserDeviceId(uid: string, deviceId: string): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      deviceId,
      lastLoginAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path, auth);
  }
}

export async function touchUserLastLogin(uid: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', uid), {
      lastLoginAt: serverTimestamp(),
    });
  } catch {
    // Non-critical login timestamp update
  }
}

/**
 * Creates a new Firebase Auth Sales Rep using a Secondary Firebase App instance
 * so Super Admin is NEVER logged out, then saves users/{uid} in superDb.
 */
export async function createRepAccountInFirebase(params: {
  name: string;
  phone: string;
  notes: string;
  pin: string;
  durationDays: number;
  role: UserRole;
}): Promise<{ uid: string; cleanPhone: string }> {
  const cleanPhone = normalizePhone(params.phone);
  const cleanPin = normalizeEnglishDigits(params.pin).trim();
  const email = phoneToAuthEmail(cleanPhone);

  if (!email || cleanPhone.length < 7) {
    throw new Error('ژمارەیا موبایلێ نادروستە');
  }
  if (cleanPin.length < 6) {
    throw new Error('کۆدێ نهێنی (PIN) پێتڤیە 6 ژمارە بیت');
  }

  const secondaryApp =
    getApps().find((a) => a.name === 'Secondary') ?? initializeApp(firebaseConfig, 'Secondary');
  const secondaryAuth = getAuth(secondaryApp);

  let createdUid = '';
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, cleanPin);
    createdUid = cred.user.uid;
  } finally {
    await signOut(secondaryAuth).catch(() => {});
  }

  const safeDays = Math.max(1, Math.floor(Number(params.durationDays) || 30));
  const expiresAt = Timestamp.fromMillis(Date.now() + safeDays * 86_400_000);
  const path = `users/${createdUid}`;

  try {
    await setDoc(doc(superDb, 'users', createdUid), {
      name: params.name.trim().slice(0, 120),
      phone: cleanPhone.slice(0, 30),
      notes: (params.notes || '').trim().slice(0, 300),
      role: params.role,
      active: true,
      expiresAt,
      deviceId: null,
      createdAt: serverTimestamp(),
      lastLoginAt: null,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path, superAuth);
  }

  return { uid: createdUid, cleanPhone };
}

/**
 * Creates a dedicated Company Admin (/admin) account with Username + Password
 * from /accounts without giving them Super Admin access.
 */
export async function createCompanyAdminInFirebase(params: {
  username: string;
  displayName: string;
  password: string;
}): Promise<{ uid: string; cleanUsername: string }> {
  const check = validateCompanyAdminCredentials(params.username, params.password);
  if (!check.valid) {
    throw new Error(check.error || 'زانیاری نادروستن');
  }

  const email = adminUsernameToEmail(check.cleanUsername);
  const secondaryApp =
    getApps().find((a) => a.name === 'Secondary') ?? initializeApp(firebaseConfig, 'Secondary');
  const secondaryAuth = getAuth(secondaryApp);

  let createdUid = '';
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, params.password);
    createdUid = cred.user.uid;
  } finally {
    await signOut(secondaryAuth).catch(() => {});
  }

  const tenYearsMs = Date.now() + 3650 * 86_400_000;
  const path = `users/${createdUid}`;

  try {
    await setDoc(doc(superDb, 'users', createdUid), {
      name: (params.displayName || 'ئەدمینێ کومگەهێ').trim().slice(0, 120),
      phone: check.cleanUsername.slice(0, 30),
      notes: 'ئەدمینێ کومگەهێ (/admin)',
      role: 'admin',
      active: true,
      expiresAt: Timestamp.fromMillis(tenYearsMs),
      deviceId: null,
      createdAt: serverTimestamp(),
      lastLoginAt: null,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path, superAuth);
  }

  return { uid: createdUid, cleanUsername: check.cleanUsername };
}

// Super Admin User Management Operations (executed via superDb + superAuth)
export async function toggleUserActive(uid: string, nextActive: boolean): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(superDb, 'users', uid), { active: nextActive });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path, superAuth);
  }
}

export async function renewUserPlan(
  uid: string,
  currentExpiresAtMs: number,
  addDays: number
): Promise<void> {
  const path = `users/${uid}`;
  const safeDays = Math.max(1, Math.floor(Number(addDays) || 30));
  const baseMs = Math.max(Date.now(), currentExpiresAtMs || 0);
  const nextExpiresAt = Timestamp.fromMillis(baseMs + safeDays * 86_400_000);
  try {
    await updateDoc(doc(superDb, 'users', uid), { expiresAt: nextExpiresAt });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path, superAuth);
  }
}

export async function resetUserDeviceLock(uid: string): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(superDb, 'users', uid), { deviceId: null });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path, superAuth);
  }
}

export async function deleteUserAccountDoc(uid: string): Promise<void> {
  const path = `users/${uid}`;
  try {
    await deleteDoc(doc(superDb, 'users', uid));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path, superAuth);
  }
}

// Cloud synchronization functions for Products & Categories (Primary db)
export async function syncProductToFirestore(product: Product): Promise<void> {
  const path = `products/${product.id}`;
  try {
    await setDoc(doc(db, 'products', product.id), {
      title: product.title,
      category: product.category,
      images: product.images || [],
      piecesPerCarton: product.piecesPerCarton,
      piecePrice: product.piecePrice,
      cartonPrice: product.cartonPrice,
      stockCartons: product.stockCartons,
      stockPieces: product.stockPieces,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path, auth);
  }
}

export async function deleteProductFromFirestore(productId: string): Promise<void> {
  const path = `products/${productId}`;
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path, auth);
  }
}

export async function syncCategoryToFirestore(category: Category, order: number): Promise<void> {
  const path = `categories/${category.id}`;
  try {
    await setDoc(doc(db, 'categories', category.id), {
      id: category.id,
      name: category.name,
      icon: category.icon || '📦',
      order,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path, auth);
  }
}

export async function deleteCategoryFromFirestore(categoryId: string): Promise<void> {
  const path = `categories/${categoryId}`;
  try {
    await deleteDoc(doc(db, 'categories', categoryId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path, auth);
  }
}

export async function fetchAllFromFirestore(): Promise<{
  products: Product[];
  categories: Category[];
} | null> {
  try {
    const prodSnap = await getDocs(collection(db, 'products'));
    const catSnap = await getDocs(collection(db, 'categories'));

    if (prodSnap.empty && catSnap.empty) {
      return null;
    }

    const products: Product[] = [];
    prodSnap.forEach((d) => {
      const data = d.data();
      products.push({
        id: d.id,
        title: data.title || '',
        category: data.category || '',
        images: Array.isArray(data.images) ? data.images : [],
        piecesPerCarton: Number(data.piecesPerCarton) || 12,
        piecePrice: Number(data.piecePrice) || 0,
        cartonPrice: Number(data.cartonPrice) || 0,
        stockCartons: Number(data.stockCartons) || 0,
        stockPieces: Number(data.stockPieces) || 0,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      });
    });

    const categoriesWithOrder: { cat: Category; order: number }[] = [];
    catSnap.forEach((d) => {
      const data = d.data();
      categoriesWithOrder.push({
        cat: {
          id: d.id,
          name: data.name || '',
          icon: data.icon || '📦',
        },
        order: typeof data.order === 'number' ? data.order : 999,
      });
    });

    categoriesWithOrder.sort((a, b) => a.order - b.order);
    const categories = categoriesWithOrder.map((c) => c.cat);

    return { products, categories };
  } catch (err) {
    console.warn('Could not fetch from Firestore:', err);
    return null;
  }
}
