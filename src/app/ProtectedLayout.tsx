"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  // Immediate redirect for unauthenticated users
  if (status === "unauthenticated") {
    console.log("User is not authenticated, redirecting to login");
    router.push("/auth/login");
    return null;
  }

  // Loading state with fallback
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  return <>{children}</>;
}
