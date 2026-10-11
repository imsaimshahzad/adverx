import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { reportError } from "./lib/error-handling";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => reportError("query failed", error),
    }),
    mutationCache: new MutationCache({
      onError: (error) => reportError("mutation failed", error),
    }),
    defaultOptions: {
      queries: {
        // Retry transient failures once; avoid retry loops for broken permissions/schema.
        retry: 1,
      },
      // Mutations may have financial side effects and must never be retried automatically.
      mutations: {
        retry: false,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
