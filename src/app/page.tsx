"use client";

import { useRouter } from "next/navigation";


export default function Home() {
    const router = useRouter();
  return (
    <div className="container">
        <h1>Portman</h1>
        <div>
            <button onClick={() => router.push("/auth/login")}>Login</button>
            <button onClick={() => router.push("/auth/register")}>Register</button>
        </div>

    </div>

  );
}
