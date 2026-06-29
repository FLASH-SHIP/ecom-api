"use client";

import dynamic from "next/dynamic";

const PagesContent = dynamic(() => import("./PagesContent"), { ssr: false });

export default function PagesPage() {
  return <PagesContent />;
}
