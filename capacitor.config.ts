import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.twins.app',
  appName: 'Twins',
  webDir: 'public', // On met 'public' par défaut, Capacitor ne s'en servira pas
  server: {
    url: 'https://clone-app-v1.vercel.app/', // <-- L'ADRESSE DE TON SERVEUR VIVANT
    cleartext: true // <-- VITAL: Autorise Android à charger du HTTP (sans le S de HTTPS)
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: "#050a0c",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP"
    }
  }
};

export default config;
