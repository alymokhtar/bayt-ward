import { cn } from "@/lib/utils";
import { type InputHTMLAttributes, forwardRef } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-brown"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "flex h-11 w-full rounded-lg border bg-white px-4 py-2 text-sm text-brown",
            "placeholder:text-muted transition-colors duration-200",
            "focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-cream-dark",
            error
              ? "border-danger focus:ring-danger/30 focus:border-danger"
              : "border-border hover:border-brown/30",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-danger font-medium">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-muted">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
