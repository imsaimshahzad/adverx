import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getSupabase, isImpersonating } from "@/integrations/supabase/client";
import { usePlatform } from "@/lib/platform-store";

export function ImpersonationBanner() {
  const { state } = usePlatform();
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(isImpersonating());
  }, []);

  if (!active || !state.user) return null;

  const exit = async () => {
    try {
      await getSupabase().auth.signOut({ scope: "local" });
      getSupabase().auth.stopAutoRefresh();
    } finally {
      sessionStorage.removeItem("adverx-impersonating");
      sessionStorage.removeItem("adverx-impersonation-verified");
      window.close();
    }
  };

  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex h-10 items-center justify-center gap-3 bg-amber-500 px-3 text-sm font-medium text-black shadow-md">
      <span>You are viewing as {state.user.fullName}</span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 border-black/20 bg-white/70 px-3 text-xs text-black hover:bg-white"
        onClick={() => void exit()}
      >
        Exit
      </Button>
    </div>
  );
}
