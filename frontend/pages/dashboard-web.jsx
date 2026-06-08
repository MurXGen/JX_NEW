"use client";

import { useEffect } from "react";
import { useRouter } from "next/router";
import FullPageLoader from "@/components/ui/FullPageLoader";

/**
 * Merged into /dashboard (revamp v2). This route is kept only so old
 * links and bookmarks keep working.
 */
export default function DashboardWebRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return <FullPageLoader />;
}
