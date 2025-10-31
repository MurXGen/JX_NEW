// pages/404.jsx
import { useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

export default function Custom404() {
  const router = useRouter();

  useEffect(() => {
    // Set landing page background
    document.body.style.backgroundColor = "#020202";
    document.body.style.color = "white";

    return () => {
      document.body.style.backgroundColor = "";
      document.body.style.color = "";
    };
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace("/"); // Redirect to homepage
    }, 2000); // wait 2 seconds for smooth UX

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <>
      <Head>
        <title>Page Not Found | JournalX</title>
        <meta
          name="description"
          content="The page you’re looking for doesn’t exist. Redirecting you to JournalX homepage."
        />
        <meta name="robots" content="noindex, follow" />
      </Head>

      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "8px",
          backgroundColor: "#000000",
          color: "#fff",
          textAlign: "center",
        }}
      >
        <h1 className="font_32">🚧 Page Not Found</h1>
        <p className="font_16">Redirecting you to JournalX homepage...</p>
      </div>
    </>
  );
}
