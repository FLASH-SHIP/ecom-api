import type { SVGProps } from "react";

export function ExportFileIcon({ className = "", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="13"
      height="15"
      viewBox="0 0 13 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M1.83333 13.8333H11.1667C11.5203 13.8333 11.8594 13.6929 12.1095 13.4428C12.3595 13.1928 12.5 12.8536 12.5 12.5V3.83333L9.16667 0.5H3.16667C2.81304 0.5 2.47391 0.640476 2.22386 0.890524C1.97381 1.14057 1.83333 1.47971 1.83333 1.83333V4.5M8.5 0.5V3.16667C8.5 3.52029 8.64048 3.85943 8.89052 4.10948C9.14057 4.35952 9.47971 4.5 9.83333 4.5H12.5M0.5 9.16667H7.16667M5.16667 7.16667L7.16667 9.16667L5.16667 11.1667"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
