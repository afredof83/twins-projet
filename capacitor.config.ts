import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.twins.app',
  appName: 'Ipse',
  webDir: 'public',
  server: {
    url: 'https://dcilf-2a01-cb1c-8455-9a00-d9eb-7f41-cc38-a57a.a.free.pinggy.link', // 🚀 CORRECTION : https://
    cleartext: true
  }
};

export default config;