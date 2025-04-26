// Page for login form

"use client";

import LoginForm from "@/components/LoginForm";

export default function Page() {
  return (
    <div className="relative w-screen h-[calc(100vh-70px)] bg-[url('/login-bg.png')] bg-no-repeat bg-cover bg-center">
      <div className="relative flex items-center justify-center h-full">
        <LoginForm />
      </div>
    </div>
  );
}
