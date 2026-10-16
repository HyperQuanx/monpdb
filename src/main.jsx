import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Application from "./app/Application";
import PasswordGate from "./components/PasswordGate";
import { preloadRouteModules } from "./app/routeModules";
import { CACHE_MAX_AGE, isHttpMode } from "./data/http/config";
import { startQueryPersistence } from "./data/cache/queryPersistence";
import "./styles/reset.css";
import "./styles/tokens.css";
import "./styles/global.css";

const queryClient = new QueryClient({ defaultOptions: { queries: {
  gcTime: CACHE_MAX_AGE,
  ...(isHttpMode ? { refetchOnWindowFocus: false, retry: false } : {}),
} } });

await startQueryPersistence(queryClient);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <PasswordGate queryClient={queryClient}><Application /></PasswordGate>
    </QueryClientProvider>
  </StrictMode>,
);

// Warm every route chunk after first paint. The data attribute lets E2E tests
// wait for it before simulating offline navigation.
preloadRouteModules().then(() => {
  document.documentElement.dataset.routesPreloaded = "true";
});
