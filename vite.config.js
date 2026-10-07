import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  if (mode === "ios") {
    if (env.VITE_DATA_MODE !== "http") throw new Error("iOS builds must set VITE_DATA_MODE=http in .env.ios.local.");
    const apiUrl = env.VITE_API_BASE_URL;
    if (!apiUrl || apiUrl.includes("example.invalid") || new URL(apiUrl).protocol !== "https:") {
      throw new Error("Set VITE_API_BASE_URL to the HTTPS API host reachable from the iPhone in .env.ios.local.");
    }
  }
  return {
    plugins: [react()],
    test: {
      environment: "jsdom",
      setupFiles: "./src/test/setup.js",
      include: ["src/**/*.test.{js,jsx}"],
      clearMocks: true,
      restoreMocks: true,
      // Full-form jsdom flows (e.g. the character "every field" test) take ~2s
      // alone but 5s+ when every worker runs in parallel, which crossed the
      // 5s default and made `npm test` flaky. Keep a wider budget for them.
      testTimeout: 15_000,
    },
  };
});
