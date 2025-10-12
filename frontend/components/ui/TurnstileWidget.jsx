// components/TurnstileWidget.jsx
import React, { useEffect } from "react";

export default function TurnstileWidget() {
  useEffect(() => {
    // script is loaded in HTML head or dynamically below
    if (!window.turnstile && !document.querySelector("#cf-turnstile-script")) {
      const s = document.createElement("script");
      s.id = "cf-turnstile-script";
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    }
  }, []);

  return (
    <div
      className="cf-turnstile"
      data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
    />
  );
}
