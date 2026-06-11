"use client";

import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { type LucideIcon, Inbox } from "lucide-react";
import { type ReactNode } from "react";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  children?: ReactNode;
  className?: string;
}

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border",
        "bg-cream-dark/30 px-6 py-16 text-center",
        className
      )}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/10">
        <Icon className="h-8 w-8 text-gold" strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-semibold text-brown">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-muted leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-6">
          {action.href ? (
            <a href={action.href}>
              <Button variant="primary">{action.label}</Button>
            </a>
          ) : (
            <Button variant="primary" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
