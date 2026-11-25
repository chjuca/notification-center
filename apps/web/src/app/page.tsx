"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { NotificationsPanel } from "@/components/notifications-panel";
import { useToken } from "@/lib/session";

export default function HomePage() {
  const token = useToken();
  const router = useRouter();

  useEffect(() => {
    if (token === null) {
      router.replace("/login");
    }
  }, [token, router]);

  if (!token) {
    return null;
  }

  return <NotificationsPanel token={token} />;
}
