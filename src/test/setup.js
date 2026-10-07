import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./mocks/server";

// First renders of large forms take ~300ms alone and ~2.5x longer under the
// parallel full suite, so the 1s findBy/waitFor default leaves little margin.
// Tests that assert timing pass an explicit `timeout` and are unaffected.
configure({ asyncUtilTimeout: 3_000 });

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => server.close());
