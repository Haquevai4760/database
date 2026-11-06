import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

let cachedIdToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      cachedIdToken = null;
      onAuthFailure?.();
      return;
    }

    try {
      cachedIdToken = await user.getIdToken();
      onAuthSuccess?.(user, cachedIdToken);
    } catch (error) {
      console.error('[Firebase Auth] Could not refresh ID token:', error);
      cachedIdToken = null;
      onAuthSuccess?.(user, null);
    }
  });
};

export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken(true);
  cachedIdToken = idToken;

  return {
    user: result.user,
    // Kept as accessToken for compatibility with existing LoginView/App props.
    // This value is a Firebase ID token, NOT a Google OAuth access token.
    accessToken: idToken,
  };
};

export const getAccessToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    cachedIdToken = await user.getIdToken();
    return cachedIdToken;
  } catch (error) {
    console.error('[Firebase Auth] ID token refresh failed:', error);
    return null;
  }
};

export const setAccessToken = (token: string | null): void => {
  // Compatibility function. Firebase is the source of truth; never persist tokens.
  cachedIdToken = token;
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
  cachedIdToken = null;
};

export const getCurrentFirebaseUser = (): User | null => auth.currentUser;
