import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.twins.app',
  appName: 'Twins',
  webDir: 'public', // On met 'public' par défaut, Capacitor ne s'en servira pas
  // @ts-ignore: Property might be deprecated in newer Capacitor versions
  bundledWebRuntime: false,
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
