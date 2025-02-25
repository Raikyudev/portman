"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const hiddenRoutes = ["/", "/auth/login", "/auth/register"];
  console.log("Session: " + session?.user);
  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  return (
    <nav className={"flex justify-between items-center p-2 border"}>
      <Link href="/" className="text-lg font-bold">
        Portman
      </Link>
      {session && !hiddenRoutes.includes(pathname) && (
        <button onClick={handleLogout}>Logout</button>
      )}
    </nav>
  );
}
