import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import {
  auth,
  bindUserDeviceId,
  bootstrapSuperAdminProfile,
  db,
  handleFirestoreError,
  loginCompanyAdmin,
  loginWithPhonePin,
  logoutUser,
  OperationType,
  parseFirestoreUserDoc,
  syncCategoryToFirestore,
  syncProductToFirestore,
  testConnection,
  touchUserLastLogin,
} from '../firebase.ts';
import { getInitialCategories, getInitialProducts, saveCategoriesAndProducts } from '../storage.ts';
import type { Category, Product, UserAccount, UserRole } from '../types.ts';
import { getOrCreateDeviceId } from '../utils/deviceId.ts';
import { checkDeviceAccess, isSubscriptionActive } from '../utils/subscription.ts';

export type AccessState =
  | 'loading'
  | 'unauthenticated'
  | 'no_profile'
  | 'subscription_blocked'
  | 'authorized';

export const DEVICE_LOCKED_MESSAGE =
  '⚠️ ئەڤ حسابە ل سەر موبایلەکا دی هاتیە گرێدان. بۆ گوهۆڕینا موبایلێ پەیوەندیێ ب رێڤەبەری بکە.';

export const SUBSCRIPTION_BLOCKED_MESSAGE =
  '⚠️ بەشدارییا تە هاتیە ڕاگرتن یان خلاس بوویە، بۆ نویکرنێ پەیوەندیێ ب رێڤەبەری بکە.';

interface FirebaseContextType {
  user: User | null;
  userProfile: UserAccount | null;
  role: UserRole | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isOnline: boolean;
  deviceId: string | null;
  accessState: AccessState;
  authError: string | null;
  clearAuthError: () => void;
  products: Product[];
  categories: Category[];
  catalogLoading: boolean;
  loginPhonePin: (phone: string, pin: string) => Promise<User>;
  loginAdminCredentials: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  syncWithCloud: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType>({
  user: null,
  userProfile: null,
  role: null,
  isAdmin: false,
  isSuperAdmin: false,
  isOnline: false,
  deviceId: null,
  accessState: 'loading',
  authError: null,
  clearAuthError: () => {},
  products: [],
  categories: [],
  catalogLoading: true,
  loginPhonePin: async () => {
    throw new Error('Not initialized');
  },
  loginAdminCredentials: async () => {
    throw new Error('Not initialized');
  },
  logout: async () => {},
  syncWithCloud: async () => {},
});

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserAccount | null>(null);
  const [profileResolved, setProfileResolved] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const touchedUidRef = useRef<string | null>(null);
  const bootstrappingUidRef = useRef<string | null>(null);

  // Initialize deviceId, connectivity test, auth listener, and expiry clock
  useEffect(() => {
    testConnection().then((connected) => setIsOnline(connected));

    getOrCreateDeviceId().then((id) => setDeviceId(id));

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setUserProfile(null);
        setProfileResolved(true);
        setProducts([]);
        setCategories([]);
        touchedUidRef.current = null;
        bootstrappingUidRef.current = null;
      } else {
        setProfileResolved(false);
      }
      setAuthReady(true);
    });

    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 15_000);

    return () => {
      unsubscribeAuth();
      window.clearInterval(timer);
    };
  }, []);

  // Real-time listener on users/{uid} for instant kill-switch and 1-device lock
  useEffect(() => {
    if (!authReady || !user || !deviceId) {
      return;
    }

    const userPath = `users/${user.uid}`;
    const userDocRef = doc(db, 'users', user.uid);

    const unsubUser = onSnapshot(
      userDocRef,
      async (snap) => {
        if (!snap.exists()) {
          // Auto-bootstrap verified owner email as superadmin
          if (
            user.email === 'omedrekani128@gmail.com' &&
            user.emailVerified &&
            bootstrappingUidRef.current !== user.uid
          ) {
            bootstrappingUidRef.current = user.uid;
            try {
              await bootstrapSuperAdminProfile(user, db, auth);
            } catch (err) {
              console.error('Failed to bootstrap superadmin profile:', err);
              setUserProfile(null);
              setProfileResolved(true);
            }
            return;
          }

          setUserProfile(null);
          setProfileResolved(true);
          return;
        }

        const parsed = parseFirestoreUserDoc(snap.id, snap.data() as Record<string, unknown>);
        const deviceCheck = checkDeviceAccess(parsed, deviceId);

        if (!deviceCheck.allowed) {
          setAuthError(DEVICE_LOCKED_MESSAGE);
          setUserProfile(null);
          setProfileResolved(true);
          await logoutUser().catch(() => {});
          return;
        }

        if (deviceCheck.needsBind) {
          try {
            await bindUserDeviceId(user.uid, deviceId);
          } catch (err) {
            console.error('Device binding failed:', err);
          }
        } else if (touchedUidRef.current !== user.uid) {
          touchedUidRef.current = user.uid;
          void touchUserLastLogin(user.uid);
        }

        setUserProfile(parsed);
        setProfileResolved(true);
      },
      (error) => {
        console.error('User subscription listener error:', error);
        setProfileResolved(true);
        if (auth.currentUser) {
          try {
            handleFirestoreError(error, OperationType.GET, userPath);
          } catch {
            // Surface cleanly via authError without crashing entire React tree
            setAuthError('پشکنینا حسابێ تە سەرنەکەفت. دوبارە هەول بدە.');
          }
        }
      }
    );

    return () => unsubUser();
  }, [authReady, user, deviceId]);

  // Compute access state
  const accessState: AccessState = useMemo(() => {
    if (!authReady || !deviceId || (user && !profileResolved)) {
      return 'loading';
    }
    if (!user) {
      return 'unauthenticated';
    }
    if (!userProfile) {
      return 'no_profile';
    }
    if (!isSubscriptionActive(userProfile, nowMs)) {
      return 'subscription_blocked';
    }
    return 'authorized';
  }, [authReady, deviceId, user, profileResolved, userProfile, nowMs]);

  const role: UserRole | null = userProfile?.role ?? null;
  const isAdmin = accessState === 'authorized' && (role === 'admin' || role === 'superadmin');
  const isSuperAdmin = accessState === 'authorized' && role === 'superadmin';

  // ONLY subscribe to products and categories when user is active & unexpired
  useEffect(() => {
    if (accessState !== 'authorized') {
      setProducts([]);
      setCategories([]);
      setCatalogLoading(false);
      return;
    }

    setCatalogLoading(true);
    let productsReady = false;
    let categoriesReady = false;

    const finishLoadingIfReady = () => {
      if (productsReady && categoriesReady) {
        setCatalogLoading(false);
      }
    };

    const unsubProducts = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const cloudProducts: Product[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          cloudProducts.push({
            id: docSnap.id,
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

        setProducts(cloudProducts);
        productsReady = true;
        finishLoadingIfReady();

        if (cloudProducts.length > 0) {
          const curCats = getInitialCategories();
          saveCategoriesAndProducts(curCats, cloudProducts);
        }
      },
      (error) => {
        console.warn('Products listener error:', error);
        productsReady = true;
        finishLoadingIfReady();
      }
    );

    const unsubCategories = onSnapshot(
      collection(db, 'categories'),
      (snapshot) => {
        const items: { cat: Category; order: number }[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({
            cat: {
              id: docSnap.id,
              name: data.name || '',
              icon: data.icon || '📦',
            },
            order: typeof data.order === 'number' ? data.order : 999,
          });
        });
        items.sort((a, b) => a.order - b.order);
        const cloudCategories = items.map((i) => i.cat);

        setCategories(cloudCategories);
        categoriesReady = true;
        finishLoadingIfReady();

        if (cloudCategories.length > 0) {
          const curProds = getInitialProducts();
          saveCategoriesAndProducts(cloudCategories, curProds);
        }
      },
      (error) => {
        console.warn('Categories listener error:', error);
        categoriesReady = true;
        finishLoadingIfReady();
      }
    );

    return () => {
      unsubProducts();
      unsubCategories();
    };
  }, [accessState]);

  const loginPhonePin = async (phone: string, pin: string): Promise<User> => {
    setAuthError(null);
    return loginWithPhonePin(phone, pin);
  };

  const loginAdminCredentials = async (username: string, password: string): Promise<User> => {
    setAuthError(null);
    return loginCompanyAdmin(username, password);
  };

  const logout = async (): Promise<void> => {
    setAuthError(null);
    await logoutUser();
  };

  const syncWithCloud = async (): Promise<void> => {
    if (!isAdmin) return;
    const prods = products.length > 0 ? products : getInitialProducts();
    const cats = categories.length > 0 ? categories : getInitialCategories();

    for (let i = 0; i < cats.length; i++) {
      await syncCategoryToFirestore(cats[i], i + 1);
    }

    for (const p of prods) {
      await syncProductToFirestore(p);
    }
  };

  return (
    <FirebaseContext.Provider
      value={{
        user,
        userProfile,
        role,
        isAdmin,
        isSuperAdmin,
        isOnline,
        deviceId,
        accessState,
        authError,
        clearAuthError: () => setAuthError(null),
        products,
        categories,
        catalogLoading,
        loginPhonePin,
        loginAdminCredentials,
        logout,
        syncWithCloud,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => useContext(FirebaseContext);
