"use client";

import dynamic from "next/dynamic";

const GroupsContent = dynamic(() => import("./GroupsContent"), {
  ssr: false,
});

export default function GroupsClient() {
  return <GroupsContent />;
}
