import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

const variants = {
  primary:
    "bg-gold text-primary-foreground hover:bg-gold-dark shadow-sm hover:shadow-md border border-gold-dark/20",
  secondary:
    "bg-gold text-primary-foreground hover:bg-gold-dark shadow-sm border border-gold-dark/20",
  outline:
    "bg-transparent text-brown border-2 border-brown/20 hover:border-gold hover:text-gold hover:bg-gold/5",
  danger:
    "bg-danger text-white hover:bg-red-700 shadow-sm border border-red-800/20",
  ghost: "bg-transparent text-brown hover:bg-brown/5 hover:text-gold",
};

const sizes = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
  icon: "h-10 w-10 p-0",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
