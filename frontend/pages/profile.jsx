"use client";

/* Standalone /profile route — renders the same modern Settings/Profile
   experience used inside the dashboard (revampV2 SettingsPanel), so the
   dedicated page matches the real profile UI instead of the legacy layout. */

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import SettingsPanel from "@/components/revampV2/SettingsPanel";
import { getFromIndexedDB } from "@/utils/indexedDB";

export default function ProfilePage() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const u = await getFromIndexedDB("user-data");
        if (active) setUserData(u);
      } catch {
        /* keep null → SettingsPanel shows sensible fallbacks */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--color-bg-canvas)",
        padding: "var(--space-4)",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <SettingsPanel
          user={userData}
          onNavigate={(id) => router.push(`/dashboard?view=${id}`)}
          onSupport={() => router.push("/dashboard?support=1")}
          onSwitchJournal={() => router.push("/accounts")}
        />
      </div>
    </div>
  );
}
