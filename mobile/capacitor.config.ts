import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'id.go.manado.dinaspangan',
  appName: 'Dinas Pangan Kota Manado',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
