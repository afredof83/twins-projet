import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.twins.app',
  appName: 'Twins',
  webDir: 'public', // On met 'public' par défaut, Capacitor ne s'en servira pas
  server: {
    url: 'https://clone-app-v1.vercel.app/', // <-- L'ADRESSE DE TON SERVEUR VIVANT
    cleartext: true // <-- VITAL: Autorise Android à charger du HTTP (sans le S de HTTPS)
  }
};

export default config;
