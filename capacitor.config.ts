import type { CapacitorConfig } from '@capacitor/cli';

// The iOS app wraps the same web build (dist/). Change appId if you prefer a different bundle ID;
// it must match the one registered in App Store Connect.
const config: CapacitorConfig = {
  appId: 'com.josephrich.notequest',
  appName: 'NoteQuest',
  webDir: 'dist',
  ios: {
    contentInset: 'never',
    backgroundColor: '#fff8ec',
  },
};

export default config;
