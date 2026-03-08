import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ipse.agent',
  appName: 'Ipse',
  webDir: 'public', // Peu importe pour l'instant
  // @ts-ignore
  bundledWebRuntime: false,
  server: {
    url: 'http://192.168.1.22:3000', // ⚠️ INJECTE TON IP ICI
    cleartext: true,
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
