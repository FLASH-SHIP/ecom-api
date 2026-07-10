import type { SVGProps } from "react";

export function ImportFileIcon({ className = "", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={className}
      width="34"
      height="38"
      viewBox="0 0 34 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M5.33333 35.3333H28.6667C29.5507 35.3333 30.3986 34.9821 31.0237 34.357C31.6488 33.7319 32 32.8841 32 32V10.3333L23.6667 2H8.66667C7.78261 2 6.93477 2.35119 6.30964 2.97631C5.68452 3.60143 5.33333 4.44928 5.33333 5.33333V12M22 2V8.66667C22 9.55072 22.3512 10.3986 22.9763 11.0237C23.6014 11.6488 24.4493 12 25.3333 12H32M2 23.6667H18.6667M13.6667 18.6667L18.6667 23.6667L13.6667 28.6667"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
