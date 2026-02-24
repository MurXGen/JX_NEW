"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FullPageLoader from "@/components/ui/FullPageLoader"; // adjust path

export default function WebRedirect({ children }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkWidth = () => {
      if (window.innerWidth > 600) {
        router.replace("/dashboard-web");
      } else {
        setLoading(false); // allow mobile UI
      }
    };

    checkWidth();
    window.addEventListener("resize", checkWidth);

    return () => window.removeEventListener("resize", checkWidth);
  }, [router]);

  if (loading) {
    return <FullPageLoader />;
  }

  return <>{children}</>;
}
