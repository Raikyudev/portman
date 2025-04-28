// Page for register form

"use client";

import RegisterForm from "@/components/RegisterForm";

export default function Page() {
  return (
    <div className="relative w-screen h-[calc(100vh-70px)] bg-[url('/login-bg.png')] bg-no-repeat bg-cover bg-center">
        {/*Source: https://www.canva.com/*/}
      <div className="relative flex items-center justify-center h-full">
        <RegisterForm />
      </div>
    </div>
  );
}
