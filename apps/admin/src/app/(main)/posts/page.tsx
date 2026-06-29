"use client";

import dynamic from "next/dynamic";

const PostsContent = dynamic(() => import("./PostsContent"), { ssr: false });

export default function PostsPage() {
  return <PostsContent />;
}
