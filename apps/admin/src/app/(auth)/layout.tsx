export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-svh flex-auto flex-col bg-background">{children}</div>;
}
