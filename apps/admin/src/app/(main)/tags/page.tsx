"use client";

import dynamic from "next/dynamic";

const TagsContent = dynamic(() => import("./TagsContent"), { ssr: false });

export default function TagsPage() {
  return <TagsContent />;
}
