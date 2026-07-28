import type { SVGProps } from "react";

export function TopupIcon({ className = "", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={className}
      width="34"
      height="34"
      viewBox="0 0 34 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M25.3333 20.3333H25.35M8.66667 8.66667H28.6667C29.5507 8.66667 30.3986 9.01786 31.0237 9.64298C31.6488 10.2681 32 11.1159 32 12V28.6667C32 29.5507 31.6488 30.3986 31.0237 31.0237C30.3986 31.6488 29.5507 32 28.6667 32H5.33333C4.44928 32 3.60143 31.6488 2.97631 31.0237C2.35119 30.3986 2 29.5507 2 28.6667V5.33333C2 4.44928 2.35119 3.60143 2.97631 2.97631C3.60143 2.35119 4.44928 2 5.33333 2H28.6667"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
