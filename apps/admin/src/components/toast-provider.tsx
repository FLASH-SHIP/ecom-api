"use client";

import { cn } from "@ecom/ui/lib/utils";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useState } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export const ToastType = {
  SUCCESS: "success" as const,
  ERROR: "error" as const,
  INFO: "info" as const,
  WARNING: "warning" as const,
};

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const toastIcons: Record<ToastType, typeof Info> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastStyles: Record<ToastType, string> = {
  success:
    "border-emerald-500/30 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
  error: "border-destructive/30 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100",
  warning: "border-amber-500/30 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  info: "border-blue-500/30 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100",
};

let staticToastFn: (message: string, type?: ToastType) => void = () => {};

export function showToast(messageOrType: string, typeOrMessage?: string) {
  const types = ["success", "error", "info", "warning"];
  if (types.includes(messageOrType)) {
    staticToastFn(typeOrMessage || "", messageOrType as ToastType);
  } else {
    staticToastFn(messageOrType, typeOrMessage as ToastType);
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Save the reference
  staticToastFn = addToast;

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-toast flex flex-col-reverse gap-2">
        {toasts.map((t) => {
          const Icon = toastIcons[t.type];
          return (
            <div
              key={t.id}
              className={cn(
                "flex min-w-[280px] max-w-[420px] items-start gap-3 rounded-lg border px-4 py-3 shadow-lg animate-in slide-in-from-right-full duration-300",
                toastStyles[t.type],
              )}
              role="alert"
            >
              <Icon className="mt-0.5 size-5 shrink-0" strokeWidth={1.8} />
              <p className="flex-1 text-sm font-medium">{t.message}</p>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="shrink-0 rounded-sm p-0.5 opacity-60 transition-opacity hover:opacity-100"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
