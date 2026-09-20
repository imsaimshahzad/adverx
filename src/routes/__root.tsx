import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  redirect,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { PlatformProvider } from "@/lib/platform-store";
import { ensureSupabaseSessionReady } from "@/integrations/supabase/client";
import { checkRouteAccess } from "@/lib/auth-guard.functions";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { Toaster } from "@/components/ui/sonner";
import { LoadingScreen } from "@/components/LoadingIndicator";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

const AUTHENTICATED_PATHS = [
  "/ads",
  "/history",
  "/network",
  "/notifications",
  "/plans",
  "/profile",
  "/support",
  "/withdraw",
  "/transactions",
  "/deposit/",
  "/users/detail/",
];

function requiresAuthentication(pathname: string) {
  return (
    AUTHENTICATED_PATHS.some((path) => pathname === path || pathname.startsWith(path)) ||
    (pathname.startsWith("/admin") && pathname !== "/admin/login")
  );
}

function requiresAdmin(pathname: string) {
  return (
    (pathname.startsWith("/admin") && pathname !== "/admin/login") ||
    pathname.startsWith("/users/detail/")
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  pendingMs: 0,
  pendingMinMs: 250,
  beforeLoad: async ({ location }) => {
    // Supabase's normal browser session is restored from client storage, so
    // there is no trustworthy server-side session to inspect during SSR.
    // The authoritative guard therefore waits for browser restoration before
    // deciding whether to redirect.
    if (typeof window === "undefined" || !requiresAuthentication(location.pathname)) {
      return;
    }

    await ensureSupabaseSessionReady();

    const adminRequired = requiresAdmin(location.pathname);
    const access = await checkRouteAccess({ data: { admin: adminRequired } });

    if (!access.authenticated) {
      throw redirect({
        to: adminRequired ? "/admin/login" : "/auth",
        search: { redirect: location.href },
      });
    }

    if (adminRequired && !access.admin) {
      throw redirect({
        to: "/auth",
        search: { redirect: location.href },
      });
    }

    return;
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AdverX — Earn from daily ad tasks" },
      {
        name: "description",
        content:
          "AdverX helps you complete verified daily ad tasks, grow your network and withdraw your earnings.",
      },
      { property: "og:title", content: "AdverX — Earn from daily ad tasks" },
      {
        property: "og:description",
        content: "Complete verified daily ad tasks, grow your network and withdraw earnings.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://adverx.online" },
  { property: "og:image", content: "/adverx-logo.png" },
  { property: "og:site_name", content: "AdverX" },
      { name: "twitter:title", content: "AdverX" },
      { name: "twitter:description", content: "Complete verified daily ad tasks, grow your network and withdraw earnings." },
      { name: "twitter:card", content: "summary_large_image" },
    ],

    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/adverx-logo.png", type: "image/png" },
  { rel: "apple-touch-icon", href: "/adverx-logo.png" },
  { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  pendingComponent: () => <LoadingScreen label="Loading your workspace" />,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <PlatformProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <ImpersonationBanner />
        <Toaster position="top-center" richColors duration={4000} closeButton toastOptions={{ className: "top-notification glass-panel" }} />
      </PlatformProvider>
    </QueryClientProvider>
  );
}

