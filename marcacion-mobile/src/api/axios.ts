// src/api/axios.ts
import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import Constants from 'expo-constants'; // ✅ AGREGADO
import * as SecureStore from 'expo-secure-store';

// ===== Constantes =====
export const TOKEN_KEY = 'userToken';

// ===== Obtener URL de la API desde variables de entorno =====
// 1. Intenta leer de .env (EXPO_PUBLIC_API_URL)
// 2. Si no existe, lee de app.config.js (extra.apiUrl)
// 3. Si tampoco existe, usa un fallback (localhost para desarrollo)
const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  'http://localhost:5000'; // ⚠️ Fallback solo para desarrollo local

console.log('🌐 API URL configurada:', API_URL);

// ===== Instancia Axios =====
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000, // Esperamos 15 segundos antes de dar error de conexión
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Para marcar si ya reintentamos/gestionamos un 401
interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// ===== Interceptor de Request (Envío del Token) =====
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    config.headers = config.headers ?? {};

    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      (config.headers as any).Authorization = `Bearer ${token}`;
    }

    // Log para ver qué estamos enviando (Útil para debug)
    console.log(`[axios] Enviando ${config.method?.toUpperCase()} a: ${config.baseURL}${config.url}`);
    
    return config;
  },
  (error: AxiosError): Promise<never> => {
    console.error('[axios][request] error:', error.message);
    return Promise.reject(error);
  }
);

// ===== Interceptor de Response (Manejo de errores) =====
api.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    // Si la respuesta es exitosa, la dejamos pasar
    return response;
  },
  async (error: AxiosError): Promise<never> => {
    const status = error.response?.status;
    const originalRequest = error.config as RetryableRequest | undefined;

    // Debug rápido para ver qué respondió el servidor
    if (error.response) {
      console.log(`[axios] Error ${status} del servidor:`, error.response.data);
    } else {
      console.log('[axios] Error de conexión (sin respuesta del servidor)');
    }

    // Manejo de Token Vencido (401)
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

    // Retornar el error para que lo maneje el try/catch del login
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