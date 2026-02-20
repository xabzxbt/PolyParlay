import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "danger" | "outline" | "secondary" | "ghost" | "link"
    size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-button text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-strong disabled:pointer-events-none disabled:opacity-50",
                    {
                        "bg-primary text-text-primary shadow hover:bg-primary-hover active:bg-primary-active": variant === "default",
                        "bg-error text-text-primary shadow-sm hover:bg-error/90": variant === "danger",
                        "border border-border-default bg-transparent shadow-sm hover:bg-surface-3 hover:text-text-primary": variant === "outline",
                        "bg-surface-3 text-text-primary shadow-sm hover:bg-surface-3/80": variant === "secondary",
                        "hover:bg-surface-3 hover:text-text-primary": variant === "ghost",
                        "text-primary underline-offset-4 hover:underline": variant === "link",
                    },
                    {
                        "h-9 px-4 py-2": size === "default",
                        "h-8 rounded-button px-3 text-xs": size === "sm",
                        "h-10 rounded-button px-8": size === "lg",
                        "h-9 w-9": size === "icon",
                    },
                    className
                )}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }
