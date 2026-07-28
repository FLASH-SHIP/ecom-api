import type { SVGProps } from "react";

export function WhatsappIcon({
  className = "w-4 h-4 mr-2 shrink-0",
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={className}
      viewBox="0 0 128.51 128.51"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>WhatsApp logo</title>
      <defs>
        <linearGradient
          id="paint0_linear_whatsapp"
          x1="512"
          y1="576.26"
          x2="512"
          y2="447.74"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#25cf43" />
          <stop offset="1" stopColor="#61fd7d" />
        </linearGradient>
      </defs>
      <circle
        cx="512"
        cy="512"
        r="64.255"
        transform="translate(-447.74 -447.74)"
        fill="url(#paint0_linear_whatsapp)"
      />
      <path
        d="M545.8,478.51a45.81,45.81,0,0,0-72.1,55.26l-6.5,23.73,24.28-6.37a45.79,45.79,0,0,0,21.89,5.57h0a45.81,45.81,0,0,0,32.4-78.19ZM513.39,549h0A38,38,0,0,1,494,543.66l-1.39-.82-14.41,3.78,3.85-14-.91-1.44A38.08,38.08,0,1,1,513.39,549Zm20.88-28.51c-1.14-.57-6.77-3.34-7.82-3.72s-1.81-.57-2.58.57-3,3.72-3.62,4.49-1.34.86-2.48.29a31.26,31.26,0,0,1-9.2-5.68,34.49,34.49,0,0,1-6.37-7.93c-.67-1.15-.07-1.76.5-2.34s1.14-1.34,1.72-2a7.81,7.81,0,0,0,1.14-1.91,2.11,2.11,0,0,0-.1-2c-.29-.57-2.58-6.2-3.53-8.5s-1.87-1.93-2.58-2-1.43,0-2.19,0a4.21,4.21,0,0,0-3.05,1.43,12.83,12.83,0,0,0-4,9.55c0,5.63,4.1,11.07,4.67,11.84s8.07,12.32,19.55,17.28a65.9,65.9,0,0,0,6.53,2.41,15.7,15.7,0,0,0,7.21.45c2.2-.33,6.77-2.77,7.73-5.44s1-5,.67-5.44S535.42,521,534.28,520.46Z"
        transform="translate(-447.74 -447.74)"
        fill="#fff"
        fillRule="evenodd"
      />
    </svg>
  );
}
