// Forgot Password Form

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ForgotPasswordFormProps {
  onSuccess?: () => void;
}

export default function ForgotPasswordForm({
  onSuccess,
}: ForgotPasswordFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to send reset link");
      } else {
        setMessage("Password reset link sent to your email");
        if (onSuccess) onSuccess();

        // Redirect to login
        setTimeout(() => {
          router.push("/auth/login");
        }, 1000);
      }
    } catch (error) {
      setMessage("Error sending reset link");
      console.error("Forgot password error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Forgot Password
        </h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-white">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-transparent border-gray-800 text-white placeholder:text-gray-600"
            required
          />
        </div>
        {message && (
          <Alert
            variant={message.includes("sent") ? "default" : "destructive"}
            className={`${
              message.includes("sent")
                ? "bg-green-900/20 border-green-900 text-green-300"
                : "bg-red-900/20 border-red-900 text-red-300"
            }`}
          >
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
        <Button
          type="submit"
          className="w-full bg-white text-black hover:bg-gray-200 transition-colors"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Sending..." : "Send Reset Link"}
        </Button>
      </form>
    </div>
  );
}
