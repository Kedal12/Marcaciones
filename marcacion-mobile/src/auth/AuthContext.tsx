import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { login as apiLogin, me as apiMe } from '@/src/api/auth';
import { getToken, removeToken, storeToken } from '@/src/api/axios';

// ===== Tipos =====
interface UserData {
  id: string | number;
  email: string;
  rol: 'admin' | 'empleado' | string;
  nombreCompleto: string;
  idSede?: number;
  sedeNombre?: string;
}

interface AuthContextType {
  token: string | null;
  user: UserData | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

// ===== Provider =====
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<{
    token: string | null;
    user: UserData | null;
    isLoading: boolean;
  }>({
    token: null,
    user: null,
    isLoading: true,
  });

  // Bootstrap inicial: lee token de SecureStore y valida con /me
  useEffect(() => {
    const bootstrapAsync = async () => {
      setAuthState((s) => ({ ...s, isLoading: true }));
      try {
        const userToken = await getToken(); // usa helper centralizado
        if (userToken) {
          console.log('[Auth] Token encontrado, validando con /me...');
          const userData = await apiMe(); // debe fallar si token inválido
          setAuthState({ token: userToken, user: userData, isLoading: false });
          console.log('[Auth] Usuario cargado:', userData.email);
        } else {
          console.log('[Auth] No se encontró token');
          setAuthState({ token: null, user: null, isLoading: false });
        }
      } catch (e: any) {
        console.error('[Auth] Error en bootstrap:', e?.message ?? e);
        await removeToken();
        setAuthState({ token: null, user: null, isLoading: false });
      }
    };
    bootstrapAsync();
  }, []);

  // Acción: Login
  const login = async (email: string, password: string): Promise<boolean> => {
    setAuthState((s) => ({ ...s, isLoading: true, user: null }));
    try {
      // apiLogin debe devolver { token: string }
      const { token } = await apiLogin(email, password);
      if (!token) {
        throw new Error('No se recibió token del servidor.');
      }

      // Guarda token en SecureStore (lo leerá axios en cada request)
      await storeToken(token);

      // Carga datos del usuario
      const userData = await apiMe();

      setAuthState({ token, user: userData, isLoading: false });
      return true;
    } catch (error: any) {
      console.error('[Auth] Error en login:', error?.message ?? error);
      await removeToken();
      setAuthState({ token: null, user: null, isLoading: false });
      throw error;
    }
  };

  // Acción: Logout
  const logout = async (): Promise<void> => {
    setAuthState((s) => ({ ...s, isLoading: true }));
    try {
      await removeToken();
      setAuthState({ token: null, user: null, isLoading: false });
    } catch (e: any) {
      console.error('[Auth] Error en logout:', e?.message ?? e);
      setAuthState({ token: null, user: null, isLoading: false });
    }
  };

  const value = useMemo<AuthContextType>(
    () => ({
      token: authState.token,
      user: authState.user,
      isLoading: authState.isLoading,
      login,
      logout,
    }),
    [authState]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ===== Hook =====
export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return ctx;
};
