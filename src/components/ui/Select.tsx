import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { type SelectHTMLAttributes, forwardRef } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      hint,
      options,
      placeholder,
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || props.name;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-brown"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              "flex h-11 w-full appearance-none rounded-lg border bg-white px-4 py-2 ps-10 text-sm text-brown",
              "transition-colors duration-200 cursor-pointer",
              "focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-cream-dark",
              error
                ? "border-danger focus:ring-danger/30 focus:border-danger"
                : "border-border hover:border-brown/30",
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        </div>
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

Select.displayName = "Select";

export default Select;
