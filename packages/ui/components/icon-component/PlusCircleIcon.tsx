import type { SVGProps } from "react";

export function PlusCircleIcon({ className = "", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={className}
      width="38"
      height="38"
      viewBox="0 0 38 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M12 18.6667H25.3333M18.6667 12V25.3333M35.3333 18.6667C35.3333 27.8714 27.8714 35.3333 18.6667 35.3333C9.46192 35.3333 2 27.8714 2 18.6667C2 9.46192 9.46192 2 18.6667 2C27.8714 2 35.3333 9.46192 35.3333 18.6667Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
