"use client";

import ForgotPasswordForm from "@/components/ForgotPasswordForm";

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="w-full max-w-[450px]">
        <ForgotPasswordForm
          onSuccess={() => console.log("Reset link sent successfully")}
        />
      </div>
    </div>
  );
}
