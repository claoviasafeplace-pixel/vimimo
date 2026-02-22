"use client";

import { useSession } from "next-auth/react";

export function useCredits() {
  const { data: session, update } = useSession();

  return {
    credits: session?.user?.credits ?? 0,
    isAuthenticated: !!session?.user,
    refreshCredits: () => update(),
  };
}
