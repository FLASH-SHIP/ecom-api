import type { Metadata } from "next";
import { ThemeToggle } from "../../components/ThemeToggle";

export const metadata: Metadata = {
  title: "Auth",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center py-12 px-4 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/auth-bg.png')" }}
    >
      {/* Dark overlay to increase readability */}
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]" />

      {/* Theme Toggle Button */}
      <ThemeToggle className="absolute top-4 right-4 z-50 md:top-6 md:right-6" />

      {/* Container for the form card */}
      <div className="relative z-10 w-full max-w-[480px] flex flex-col items-center">
        {children}
      </div>
    </div>
  );
}
