"use client";

import React, { useEffect, useState } from "react";
import { shouldShowAdsForCurrentUser } from "@/utils/planRestrictions";

const ADSENSE_SRC =
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";

const adClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
const adSlot = process.env.NEXT_PUBLIC_ADSENSE_SLOT;

const ensureAdsScript = (client) => {
  // If already present, ensure correct client param
  if (document.querySelector(`script[data-adsbygoogle-client="${client}"]`))
    return;

  // Prevent duplicate script
  if (document.querySelector(`script[src^="${ADSENSE_SRC}"]`)) {
    const existing = document.querySelector(`script[src^="${ADSENSE_SRC}"]`);
    if (existing && client)
      existing.setAttribute("data-adsbygoogle-client", client);
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = `${ADSENSE_SRC}?client=${client}`;
  script.crossOrigin = "anonymous";
  script.setAttribute("data-adsbygoogle-client", client);
  document.head.appendChild(script);
};

const GoogleBannerAd = ({ style = {}, className = "" }) => {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const show = await shouldShowAdsForCurrentUser();

      if (!mounted) return;

      // Show only if user is allowed and env values exist
      if (!show || !adClient || !adSlot) {
        if (!adClient || !adSlot)
          console.warn("Missing AdSense client or slot environment variables.");
        setAllowed(false);
        return;
      }

      ensureAdsScript(adClient);
      setAllowed(true);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (!allowed) return null;

  return (
    <div
      className={`google-ad-container ${className}`}
      style={{
        width: "100%",
        textAlign: "center",
        padding: "8px 0",
        ...style,
      }}
    >
      <ins
        className="adsbygoogle"
        style={{ display: "block", margin: "0 auto" }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `(adsbygoogle = window.adsbygoogle || []).push({});`,
        }}
      />
    </div>
  );
};

export default GoogleBannerAd;
