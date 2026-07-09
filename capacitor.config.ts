import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.prompthavenstudio.aurastories',
  appName: 'Aura Stories',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    AdMob: {
      appIdAndroid: 'ca-app-pub-7771069325721053~XXXXXXXXXX',
      appIdIos: 'ca-app-pub-7771069325721053~YYYYYYYYYY',
    },
  },
};

export default config;
