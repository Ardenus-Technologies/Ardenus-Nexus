"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  variant?: "underline" | "bordered";
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, variant = "bordered", children, ...props }, ref) => {
    const baseStyles =
      "w-full appearance-none bg-transparent text-white cursor-pointer transition-colors duration-300 outline-none pr-8";

    const variants = {
      underline: "border-b border-white/10 py-3 focus:border-white/50",
      bordered:
        "border border-white/10 rounded-lg px-4 py-3 focus:border-white/30",
    };

    const arrowStyle = {
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 8L1 3h10L6 8z'/%3E%3C/svg%3E")`,
      backgroundRepeat: "no-repeat",
      backgroundPosition: "right 12px center",
    };

    return (
      <select
        className={cn(baseStyles, variants[variant], className)}
        style={arrowStyle}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  }
);

Select.displayName = "Select";

export { Select };
