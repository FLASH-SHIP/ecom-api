export function AuthLogo() {
  return (
    <div className="flex items-center gap-2 select-none">
      {/* Yellow circle with lightning bolt */}
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-md">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5 text-white"
        >
          <title>Ecom Express Logo</title>
          <path d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      {/* Brand Name */}
      <span className="text-lg font-black tracking-wider flex items-center">
        <span className="text-slate-900 dark:text-white">ECOM</span>
        <span className="text-cyan-500 ml-1.5">EXPRESS</span>
      </span>
    </div>
  );
}
