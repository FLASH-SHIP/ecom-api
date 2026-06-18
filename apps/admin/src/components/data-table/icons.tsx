import type { SVGProps } from "react";

/**
 * Custom lucide-style icons ported from the React theme's SVG sprite.
 * These icons don't exist in the standard lucide-react package.
 */

export function BrushCleaningIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <title>Clear sort</title>
      <path d="m16 22-1-4" />
      <path d="M19 13.99a1 1 0 0 0 1-1V12a2 2 0 0 0-2-2h-3a1 1 0 0 1-1-1V4a2 2 0 0 0-4 0v5a1 1 0 0 1-1 1H6a2 2 0 0 0-2 2v.99a1 1 0 0 0 1 1" />
      <path d="M5 14h14l1.973 6.767A1 1 0 0 1 20 22H4a1 1 0 0 1-.973-1.233z" />
      <path d="m8 22 1-4" />
    </svg>
  );
}

export function Columns3CogIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <title>Show all columns</title>
      <path d="M10.5 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5.5" />
      <path d="m14.3 19.6 1-.4" />
      <path d="M15 3v7.5" />
      <path d="m15.2 16.9-.9-.3" />
      <path d="m16.6 21.7.3-.9" />
      <path d="m16.8 15.3-.4-1" />
      <path d="m19.1 15.2.3-.9" />
      <path d="m19.6 21.7-.4-1" />
      <path d="m20.7 16.8 1-.4" />
      <path d="m21.7 19.4-.9-.3" />
      <path d="M9 3v18" />
      <circle cx="18" cy="18" r="3" />
    </svg>
  );
}
