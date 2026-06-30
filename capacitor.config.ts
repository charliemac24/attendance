import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.myosystems.attendance",
  appName: "MYO Scanner",
  webDir: "dist/public",
  server: {
    url: "https://attendance.myosystems.com/mobile/scanner?school=stars",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
