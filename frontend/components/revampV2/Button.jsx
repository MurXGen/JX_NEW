"use client";

/**
 * revampV2 Button — Figma "Components / Buttons"
 * variant: primary | secondary | outline | ghost | danger | danger-outline |
 *          danger-subtle | success | success-subtle
 * size: sm | md | lg
 */
export default function Button({
  variant = "primary",
  size = "md",
  icon: Icon,
  children,
  className = "",
  ...props
}) {
  return (
    <button
      className={`jx-btn jx-btn--${variant} ${
        size !== "md" ? `jx-btn--${size}` : ""
      } ${className}`}
      {...props}
    >
      {Icon && <Icon size={size === "sm" ? 14 : 18} />}
      {children}
    </button>
  );
}
