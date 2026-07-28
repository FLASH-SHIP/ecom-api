import type { SVGProps } from "react";

export function NotepadTextIcon({ className = "", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path
        d="M6.66659 1.66663V4.99996M9.99992 1.66663V4.99996M13.3333 1.66663V4.99996M6.66659 8.33329H11.6666M6.66659 11.6666H13.3333M6.66659 15H10.8333M4.99992 3.33329H14.9999C15.9204 3.33329 16.6666 4.07948 16.6666 4.99996V16.6666C16.6666 17.5871 15.9204 18.3333 14.9999 18.3333H4.99992C4.07944 18.3333 3.33325 17.5871 3.33325 16.6666V4.99996C3.33325 4.07948 4.07944 3.33329 4.99992 3.33329Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
