import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.twins.app',
  appName: 'Ipse',
  webDir: 'public',
  server: {
    url: 'http://192.168.1.22:3000', // 
    cleartext: true
  }
};

export default config;