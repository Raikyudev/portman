"use client";

import RegisterForm from "@/components/RegisterForm";

export default function Page() {
  return (
      <div className="relative w-screen bg-[url('/money-bg.png')] bg-no-repeat bg-cover bg-center">
          <div className="absolute inset-0 bg-red/60"></div>

          <div className="relative flex items-center justify-center min-h-screen">
              <RegisterForm />
          </div>
      </div>

  );
}
