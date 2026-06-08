"use client";

/**
 * revampV2 Badge — variant: success | danger | neutral | brand
 * Use for Buy/Long (success), Sell/Short (danger), tags (neutral/brand).
 */
export default function Badge({ variant = "neutral", icon: Icon, children }) {
  return (
    <span className={`jx-badge jx-badge--${variant}`}>
      {Icon && <Icon size={12} />}
      {children}
    </span>
  );
}
