"use client";

import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

export default function Navbar() {
  const router = useRouter();
  const { data: session } = useSession();
  console.log("Session: " + session?.user);
  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  return <nav>{session && <button onClick={handleLogout}>Logout</button>}</nav>;
}
