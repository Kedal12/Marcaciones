// app.config.js
import 'dotenv/config';

export default ({ config }) => ({
  ...config,

  name: 'Marcacion',
  slug: 'marcacion-mobile',

  // Corrige el warning de Linking
  scheme: 'marcacion',

  // Expo Router: tipado de rutas
  experiments: {
    ...(config.experiments ?? {}),
    typedRoutes: true,
  },

  // NO incluimos expo-build-properties aquí
  plugins: [
    ...(config.plugins ?? []),
    'expo-router',
  ],

  // Dev con HTTP (si tu API es http://)
  android: {
    ...(config.android ?? {}),
    //usesCleartextTraffic: true,
  },

  ios: {
    ...(config.ios ?? {}),
    infoPlist: {
      ...(config.ios?.infoPlist ?? {}),
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: true, // quítalo si pasas a HTTPS
      },
    },
  },

  extra: {
    ...(config.extra ?? {}),
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://10.15.0.221:5000',
    eas: {
      ...((config.extra && config.extra.eas) ?? {}),
    },
  },
});
