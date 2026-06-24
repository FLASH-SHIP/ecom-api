import { Button } from "@ecom/ui/components/button";

const GoogleIcon = () => (
  <svg className="w-4 h-4 mr-2 shrink-0" viewBox="0 0 24 24">
    <title>Google Logo</title>
    <path
      fill="#EA4335"
      d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.19 2.7 1.24 6.64l4.026 3.125z"
    />
    <path
      fill="#FBBC05"
      d="M16.04 15.014c-1.018.655-2.382 1.077-4.04 1.077-3.182 0-5.873-2.145-6.836-5.027l-4.04 3.127C3.073 18.245 7.19 21 12 21c3.245 0 6.136-1.127 8.164-3.073l-4.124-2.913z"
    />
    <path
      fill="#4285F4"
      d="M23.49 12.275c0-.79-.072-1.554-.204-2.29H12v4.336h6.464a5.536 5.536 0 0 1-2.4 3.636l4.123 2.914c2.409-2.223 3.803-5.5 3.803-9.596z"
    />
    <path
      fill="#34A853"
      d="M5.124 11.064c-.24-.718-.38-1.486-.38-2.29a7.03 7.03 0 0 1 .38-2.29L1.097 3.355C.4 4.75 0 6.332 0 8c0 1.668.4 3.25 1.097 4.645l4.027-2.914h.001z"
    />
  </svg>
);

const AppleIcon = () => (
  <svg className="w-4 h-4 mr-2 fill-slate-900 dark:fill-slate-100 shrink-0" viewBox="0 0 24 24">
    <title>Apple Logo</title>
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.2.67-2.92 1.49-.62.71-1.16 1.85-1.01 2.96 1.09.09 2.21-.55 2.94-1.39z" />
  </svg>
);

export function AuthSocialLogins() {
  return (
    <div className="flex flex-col gap-4">
      {/* Or continue with divider */}
      <div className="flex items-center gap-3 select-none">
        <div className="flex-1 h-[1px] bg-slate-200/60 dark:bg-slate-800/80" />
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
          hoặc tiếp tục với
        </span>
        <div className="flex-1 h-[1px] bg-slate-200/60 dark:bg-slate-800/80" />
      </div>

      {/* Grid of buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex items-center justify-center h-10 rounded-xl bg-white/50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all border-slate-200 dark:border-slate-800/80"
        >
          <GoogleIcon /> Google
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex items-center justify-center h-10 rounded-xl bg-white/50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all border-slate-200 dark:border-slate-800/80"
        >
          <AppleIcon /> Apple
        </Button>
      </div>
    </div>
  );
}
