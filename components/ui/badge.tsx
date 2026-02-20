import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "neutral" | "success" | "warning" | "error" | "info" | "outline"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
    return (
        <div
            className={cn(
                "inline-flex items-center rounded-pill border border-border-default px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-border-strong focus:ring-offset-2",
                {
                    "border-transparent bg-primary text-text-primary shadow hover:bg-primary-hover": variant === "default",
                    "border-transparent bg-surface-3 text-text-primary hover:bg-surface-3/80": variant === "neutral",
                    "border-transparent bg-success/20 text-success hover:bg-success/30": variant === "success",
                    "border-transparent bg-warning/20 text-warning hover:bg-warning/30": variant === "warning",
                    "border-transparent bg-error/20 text-error hover:bg-error/30": variant === "error",
                    "border-transparent bg-info/20 text-info hover:bg-info/30": variant === "info",
                    "text-text-primary": variant === "outline",
                },
                className
            )}
            {...props}
        />
    )
}

export { Badge }
