import { cn, getStatusBadgeColor } from "@/lib/utils";
import { type HTMLAttributes } from "react";

const variantStyles = {
  default: "bg-brown/10 text-brown border-brown/20",
  gold: "bg-gold/15 text-gold-dark border-gold/30",
  success: "bg-green-100 text-green-800 border-green-200",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
  danger: "bg-red-100 text-red-800 border-red-200",
  outline: "bg-transparent text-brown border-border",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variantStyles;
  status?: string;
}

export default function Badge({
  className,
  variant,
  status,
  children,
  ...props
}: BadgeProps) {
  const statusClass = status && !variant ? getStatusBadgeColor(status) : "";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variant ? variantStyles[variant] : statusClass || variantStyles.default,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
