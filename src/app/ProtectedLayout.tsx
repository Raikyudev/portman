"use client";

import { useSession } from "next-auth/react"; // Removed unused Session import
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      console.log("User is not authenticated, redirecting to login");
      router.push("/auth/login");
    }
  }, [status, router]);

  if (status === "unauthenticated") {
    return null;
  }

  return <>{children}</>;
}
