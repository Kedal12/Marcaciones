import 'dotenv/config';

export default ({ config }) => ({
  // 1. Hereda toda la configuración base que ya definiste en app.json
  // (nombre, slug, plugins, android package, permisos, etc.)
  ...config,

  // 2. Configuración de iOS (Opcional, mantiene lo que tenías)
  ios: {
    ...(config.ios ?? {}),
    infoPlist: {
      ...(config.ios?.infoPlist ?? {}),
      // Permite conexiones HTTP inseguras (útil para dev, aunque Ngrok usa HTTPS)
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: true, 
      },
    },
  },

  // 3. VARIABLES DE ENTORNO (Lo más importante)
  extra: {
    // Mantenemos cualquier configuración extra que venga del app.json
    ...(config.extra ?? {}),

    // ✅ LÓGICA DE CONEXIÓN:
    // Intenta leer la variable de Ngrok desde el archivo .env
    // Si no la encuentra, usa tu IP local como respaldo.
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:5000',

    // Mantiene la configuración de EAS (Project ID)
    eas: {
      ...((config.extra && config.extra.eas) ?? {}),
    },
  },
});