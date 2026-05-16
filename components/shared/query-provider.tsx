"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: true,
            retry: (failureCount, error) => {
              // Don't retry on auth errors — the interceptor already handled them
              if (
                error &&
                typeof error === "object" &&
                "status" in error &&
                (error as { status: number }).status === 401
              ) {
                return false;
              }
              return failureCount < 2;
            },
          },
        },
      }),
  );

  React.useEffect(() => {
    function handleSessionRefreshed() {
      // Invalidate every cached query so all components re-fetch with the
      // new session data (updated plan, subscription_status, user fields).
      queryClient.invalidateQueries();
    }

    window.addEventListener("thynk-session-refreshed", handleSessionRefreshed);
    return () => {
      window.removeEventListener("thynk-session-refreshed", handleSessionRefreshed);
    };
  }, [queryClient]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
