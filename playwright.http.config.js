import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e-http", workers: 1, fullyParallel: false,
  reporter: [["list"]],
  use: { baseURL: "http://127.0.0.1:4174", viewport: { width: 390, height: 844 }, trace: "retain-on-failure" },
  webServer: { command: "npm run preview -- --host 127.0.0.1 --port 4174 --outDir dist-http", port: 4174, reuseExistingServer: false },
});
