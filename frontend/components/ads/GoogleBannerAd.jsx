"use client";

import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { shouldShowAdsForCurrentUser } from "@/utils/planRestrictions";

const ADSENSE_SRC =
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";

const ensureAdsScript = (client) => {
  // If already present, ensure it has correct client param
  if (document.querySelector(`script[data-adsbygoogle-client="${client}"]`))
    return;

  // Prevent duplicate script
  if (document.querySelector(`script[src^="${ADSENSE_SRC}"]`)) {
    // If existing script present but not tagged, add client attribute (best-effort)
    const existing = document.querySelector(`script[src^="${ADSENSE_SRC}"]`);
    if (existing && client)
      existing.setAttribute("data-adsbygoogle-client", client);
    return;
  }

  const s = document.createElement("script");
  s.async = true;
  s.src = `${ADSENSE_SRC}?client=${client}`;
  s.crossOrigin = "anonymous";
  s.setAttribute("data-adsbygoogle-client", client);
  document.head.appendChild(s);
};

// Simple responsive banner component
const GoogleBannerAd = ({ adClient, adSlot, style = {}, className = "" }) => {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const show = await shouldShowAdsForCurrentUser();
      if (!mounted) return;
      if (!show) {
        setAllowed(false);
        return;
      }

      // Basic checks
      if (!adClient || !adSlot) {
        console.warn(
          "GoogleBannerAd: adClient or adSlot missing. Set env vars or props."
        );
        setAllowed(false);
        return;
      }

      ensureAdsScript(adClient);
      setAllowed(true);

      // Slight delay to allow script to load — the push will be done in render
    })();

    return () => {
      mounted = false;
    };
  }, [adClient, adSlot]);

  if (!allowed) return null;

  return (
    <div
      className={`google-ad-container ${className}`}
      style={{ width: "100%", textAlign: "center", ...style }}
    >
      {/* AdSense slot */}
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

GoogleBannerAd.propTypes = {
  adClient: PropTypes.string,
  adSlot: PropTypes.string,
  style: PropTypes.object,
  className: PropTypes.string,
};

GoogleBannerAd.defaultProps = {
  adClient: process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "",
  adSlot: process.env.NEXT_PUBLIC_ADSENSE_SLOT || "",
};

export default GoogleBannerAd;
