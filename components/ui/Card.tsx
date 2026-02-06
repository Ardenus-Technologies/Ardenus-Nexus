"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface CardProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  hover?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover = true, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          "border border-white/10 bg-transparent rounded-lg transition-all duration-300",
          hover && "hover:border-[#4f4f4f]",
          className
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = "Card";

type CardHeaderProps = ComponentPropsWithoutRef<"div">;

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("px-4 py-3 sm:px-6 sm:py-4 border-b border-white/10", className)}
        {...props}
      />
    );
  }
);

CardHeader.displayName = "CardHeader";

type CardContentProps = ComponentPropsWithoutRef<"div">;

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn("p-4 sm:p-6", className)} {...props} />;
  }
);

CardContent.displayName = "CardContent";

export { Card, CardHeader, CardContent };
