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
      // Google resmi test App ID'leri — production'da gerçek ID'lerle değiştir
      appIdAndroid: 'ca-app-pub-3940256099942544~3347511713',
      appIdIos: 'ca-app-pub-3940256099942544~1458002511',
    },
  },
};

export default config;
