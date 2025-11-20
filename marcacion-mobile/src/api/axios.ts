import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

// ===== Constantes =====
export const TOKEN_KEY = 'userToken';

// Preferir env pública, luego extra.apiUrl
const fromEnv = process.env.EXPO_PUBLIC_API_URL;
const fromConfig = (Constants.expoConfig?.extra as any)?.apiUrl;

const rawApiUrl = fromEnv || fromConfig;

if (!rawApiUrl) {
  console.error(
    '[axios] ERROR: API_URL no está definida. Configúrala en app.json -> extra.apiUrl o en EXPO_PUBLIC_API_URL'
  );
  throw new Error('API_URL no configurada');
}

// Normalizar: quitar barras finales
const API_URL = rawApiUrl.replace(/\/+$/, '');
console.log('[axios] Usando API_URL =', API_URL);

// ===== Instancia Axios =====
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Para marcar si ya reintentamos/gestionamos un 401
interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// ===== Interceptor de Request =====
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    config.headers = config.headers ?? {};

    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      (config.headers as any).Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError): Promise<never> => {
    console.error('[axios][request] error:', error.message);
    return Promise.reject(error);
  }
);

// ===== Interceptor de Response =====
api.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => response,
  async (error: AxiosError): Promise<never> => {
    const status = error.response?.status;
    const originalRequest = error.config as RetryableRequest | undefined;

    if (status === 401 && originalRequest && !originalRequest._retry) {
      console.warn('[axios][response] 401 detectado: limpiando token');
      originalRequest._retry = true;
      try {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      } catch (e) {
        console.error('[axios] Error borrando token tras 401:', e);
      }
      return Promise.reject(new Error('Unauthorized - Token limpiado'));
    }

    console.error(
      '[axios][response] error:',
      error.response?.data ?? error.message
    );
    return Promise.reject(error);
  }
);

export default api;

// ===== Helpers de token (reusables en AuthContext) =====
export const storeToken = async (token: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (e) {
    console.error('[axios] Error guardando token:', e);
  }
};

export const removeToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (e) {
    console.error('[axios] Error borrando token:', e);
  }
};

export const getToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (e) {
    console.error('[axios] Error obteniendo token:', e);
    return null;
  }
};
