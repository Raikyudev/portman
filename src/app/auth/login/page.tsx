"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

const loginSchema = z.object({
  username: z
    .string()
    .min(4, "Username must be at least 4 characters")
    .nonempty("Username is required"),
  password: z
    .string()
    .min(5, "Password must be at least 5 characters")
    .nonempty("Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Page() {
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    try {
      const response = await signIn("credentials", {
        redirect: false,
        username: data.username,
        password: data.password,
      });

      if (response?.ok) {
        setError("Log in Successful! Redirecting to Dashboard...");
        setTimeout(() => {
          reset();
          router.push("/portfolio");
        }, 1000);
      } else {
        const errorMessage = response?.error || "Invalid login credentials.";
        setError(errorMessage);
      }
    } catch {
      setError("Something went wrong. Please try again later.");
    }
  };

  return (
    <div>
      <h2>Login</h2>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label>Username</label>
          <input {...register("username")} />
          {errors.username && (
            <p className="text-red-500">{errors.username.message}</p>
          )}
        </div>

        <div>
          <label>Password</label>
          <input type="password" {...register("password")} />
          {errors.password && (
            <p className="text-red-500">{errors.password.message}</p>
          )}
        </div>
        {error && <p className="text-red-500">{error}</p>}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Logging in..." : "Log In"}
        </button>
      </form>
    </div>
  );
}
