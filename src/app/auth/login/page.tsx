"use client";

import LoginForm from "@/components/LoginForm";

export default function Page() {
  return (
    <div
      className={
        "min-h-screen min-w-screen w-screen flex items-center justify-center bg-red p-4"
      }
    >
      <LoginForm />
    </div>
  );
}
