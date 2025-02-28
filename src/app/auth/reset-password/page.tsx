"use client";

import ResetPasswordForm from "@/components/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="w-full max-w-[450px]">
        <ResetPasswordForm />
      </div>
    </div>
  );
}
