import { useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";
import { createAppRouter } from "./router";

export default function Application() {
  const [router, setRouter] = useState(null);
  useEffect(() => {
    let next;
    let cancelled = false;
    // Defer initialization so StrictMode can discard its first mount cleanly.
    queueMicrotask(() => {
      if (cancelled) return;
      next = createAppRouter(); setRouter(next);
    });
    return () => { cancelled = true; next?.dispose(); };
  }, []);
  return router ? <RouterProvider router={router} /> : null;
}
