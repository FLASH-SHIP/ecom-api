"use client";

import { cn } from "@ecom/ui/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import * as React from "react";
import { Button } from "./button";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hidePasswordToggle?: boolean;
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, type, hidePasswordToggle = false, showPasswordLabel, hidePasswordLabel, ...props },
    ref,
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const isPassword = type === "password" && !hidePasswordToggle;

    if (isPassword) {
      return (
        <div className="relative flex w-full items-center">
          <input
            type={showPassword ? "text" : "password"}
            className={cn(
              "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 lg:h-10 xl:h-11 2xl:h-[52px] w-full rounded-lg border border-input bg-background pl-3 pr-10 py-2 text-sm 2xl:text-xl placeholder:text-sm 2xl:placeholder:text-xl text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-invalid:focus-visible:ring-destructive transition-colors duration-200",
              className,
            )}
            ref={ref}
            {...props}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            tabIndex={-1}
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-transparent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={
              showPassword
                ? (hidePasswordLabel ?? "Hide password")
                : (showPasswordLabel ?? "Show password")
            }
          >
            {showPassword ? (
              <EyeOff
                data-icon="inline"
                className="select-none animate-in fade-in zoom-in duration-200"
                aria-hidden="true"
              />
            ) : (
              <Eye
                data-icon="inline"
                className="select-none animate-in fade-in zoom-in duration-200"
                aria-hidden="true"
              />
            )}
          </Button>
        </div>
      );
    }

    return (
      <input
        type={type}
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 lg:h-10 xl:h-11 2xl:h-[52px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm 2xl:text-xl placeholder:text-sm 2xl:placeholder:text-xl text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-invalid:focus-visible:ring-destructive transition-colors duration-200",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

export { Input };
