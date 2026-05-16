"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { getToken } from "./lib/api";
import { landingPath, readPreferences } from "./lib/preferences";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const preferences = readPreferences();
    router.replace(getToken() ? landingPath(preferences.defaultLandingPage) : "/login");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-5 text-zinc-300">
      Loading IXAI Agent...
    </main>
  );
}
