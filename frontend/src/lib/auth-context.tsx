import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import api from './api';

interface AuthUser {
  id: string;
  fullName: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const TOKEN_KEY = 'auth_token';

function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get('/auth/me')
      .then((response) => {
        setUser(response.data.data.user);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      try {
        const response = await api.post('/auth/login', { email, password });
        const { user: authUser, token } = response.data.data;
        localStorage.setItem(TOKEN_KEY, token);
        setUser(authUser);
        return { error: null };
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to sign in. Please try again.';
        return { error: message };
      }
    },
    []
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName: string
    ): Promise<{ error: string | null }> => {
      try {
        const response = await api.post('/auth/signup', {
          email,
          password,
          fullName,
        });
        const { user: authUser, token } = response.data.data;
        localStorage.setItem(TOKEN_KEY, token);
        setUser(authUser);
        return { error: null };
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to sign up. Please try again.';
        return { error: message };
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const getToken = useCallback(() => getStoredToken(), []);

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signUp, signOut, getToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
