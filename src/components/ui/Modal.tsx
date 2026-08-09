"use client";

import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  type ReactNode,
} from "react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  showClose?: boolean;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

function normalizeFooterNode(node: ReactNode): ReactNode {
  return Children.map(node, (child) => {
    if (!isValidElement(child)) {
      return child;
    }

    if (child.type === Button) {
      const childProps = child.props as {
        variant?: string;
        className?: string;
        size?: string;
      };

      const currentClassName = childProps.className;

      return cloneElement(child, {
        variant: "primary",
        size: childProps.size ?? "md",
        className: cn(
          "rounded-md px-4 py-2",
          "bg-[#8c5c2a] text-white border border-[#8c5c2a] shadow-sm",
          currentClassName
        ),
      });
    }

    const childChildren = (child.props as { children?: ReactNode })?.children;
    if (childChildren) {
      return cloneElement(child, {
        children: normalizeFooterNode(childChildren),
      });
    }

    return child;
  });
}

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  showClose = true,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const normalizedFooter = normalizeFooterNode(footer);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-brown/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        className={cn(
          "relative z-10 flex w-full max-h-[90vh] flex-col overflow-hidden rounded-xl border border-border bg-white shadow-2xl",
          sizeClasses[size]
        )}
      >
        {(title || showClose) && (
          <div className="shrink-0 sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-white px-6 py-4">
            <div>
              {title && (
                <h2
                  id="modal-title"
                  className="text-lg font-semibold text-brown"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-muted">{description}</p>
              )}
            </div>
            {showClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="إغلاق"
                className="shrink-0 -mt-1 -ms-2"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
            {children}
          </div>
          {footer && (
            <div className="shrink-0 sticky bottom-0 z-10 border-t border-border bg-white px-6 py-4">
              <div className="flex items-center justify-end gap-2">
                {normalizedFooter}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
