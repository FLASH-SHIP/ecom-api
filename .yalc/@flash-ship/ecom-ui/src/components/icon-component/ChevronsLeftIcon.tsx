import type { SVGProps } from "react";

export function ChevronsLeftIcon({ className = "", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="12"
      height="11"
      viewBox="0 0 12 11"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M5.16667 9.33333L1 5.16667L5.16667 1M11 9.33333L6.83333 5.16667L11 1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
