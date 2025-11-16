import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.truespend.app',
  appName: 'TrueSpend',
  webDir: 'dist',
  server: {
    // Production domain - use dev URL only in development
    url: 'https://truespend.org',
    // Allow cleartext only in development, enforce HTTPS in production
    cleartext: false
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
