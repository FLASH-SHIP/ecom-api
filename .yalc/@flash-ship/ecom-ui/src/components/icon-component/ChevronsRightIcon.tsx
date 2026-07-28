import type { SVGProps } from "react";

export function ChevronsRightIcon({ className = "", ...props }: SVGProps<SVGSVGElement>) {
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
        d="M1 9.33333L5.16667 5.16667L1 1M6.83333 9.33333L11 5.16667L6.83333 1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
