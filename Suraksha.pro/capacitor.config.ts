import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'pro.suraksha.app',
  appName: 'Suraksha.pro',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      backgroundColor: "#0D0408",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      spinnerColor: "#7B1C2C"
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0D0408",
      overlaysWebView: false
    }
  },
  android: {
    // Ensure status bar and navigation bar are always visible
    // Never use fullscreen or immersive mode
    backgroundColor: '#0D0408',
  },
};

export default config;
