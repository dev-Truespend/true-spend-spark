import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.truespend.app',
  appName: 'TrueSpend',
  webDir: 'dist',
  server: {
    url: 'https://d4487a59-0405-4f34-88da-4c7979cc73d3.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
