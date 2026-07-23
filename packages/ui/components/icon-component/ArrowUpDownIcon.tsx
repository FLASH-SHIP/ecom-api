import type { SVGProps } from "react";

export function ArrowUpDownIcon({ className = "", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M8.66667 10.6666L11.3333 13.3333L14 10.6666M11.3333 13.3333V2.66663M7.33333 5.33329L4.66667 2.66663L2 5.33329M4.66667 2.66663V13.3333"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
