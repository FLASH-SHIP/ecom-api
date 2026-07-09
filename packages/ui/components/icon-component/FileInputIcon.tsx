import type { SVGProps } from "react";

export function FileInputIcon({ className = "", ...props }: SVGProps<SVGSVGElement>) {
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
        d="M3.33341 18.3333H15.0001C15.4421 18.3333 15.866 18.1577 16.1786 17.8451C16.4912 17.5326 16.6667 17.1087 16.6667 16.6666V5.83329L12.5001 1.66663H5.00008C4.55805 1.66663 4.13413 1.84222 3.82157 2.15478C3.50901 2.46734 3.33341 2.89127 3.33341 3.33329V6.66663M11.6667 1.66663V4.99996C11.6667 5.44199 11.8423 5.86591 12.1549 6.17847C12.4675 6.49103 12.8914 6.66663 13.3334 6.66663H16.6667M1.66675 12.5H10.0001M7.50008 9.99996L10.0001 12.5L7.50008 15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
