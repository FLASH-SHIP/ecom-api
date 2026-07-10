import type { SVGProps } from "react";

export function CloseIcon({ className = "", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M9 1L1 9M1 1L9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
