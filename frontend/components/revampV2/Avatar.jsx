"use client";

/* Professional profile avatar — shows the user's photo when set, otherwise a
   clean initials badge on a subtle graphite gradient (deterministic per name). */
export default function Avatar({ name = "", src = "", size = 34, className = "", style = {} }) {
  const initials =
    (name || "")
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  return (
    <span
      className={`jx-avatar ${className}`}
      style={{ width: size, height: size, ...style }}
      aria-label={name || "Profile"}
      title={name || undefined}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name || "Profile"} />
      ) : (
        <span className="jx-avatar__initials" style={{ fontSize: Math.round(size * 0.4) }}>
          {initials}
        </span>
      )}
    </span>
  );
}
