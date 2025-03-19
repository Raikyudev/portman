import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

const signUpSchema = z
  .object({
    first_name: z.string().min(2, "First name must be at least 2 characters"),
    last_name: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Invalid email"),
    password: z.string().min(5, "Password must be at least 5 characters"),
    confirm_password: z
      .string()
      .min(5, "Password must be at least 5 characters"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords must match",
    path: ["confirm_password"],
  });

type SignUpFormData = z.infer<typeof signUpSchema>;

export default function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpFormData) => {
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(
          "Sign up successful! Please check your email to verify your account.",
        );

        reset();
        router.push("/auth/login");
      } else {
        setError(result.error);
      }
    } catch {
      setError("Can't connect to the server. Please try again later.");
    }
  };

  return (
    <div className="flex items-center justify-center bg-black p-24 border-2 border-white rounded-lg">
      <div className="w-full max-w-[450px] space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-red">
            Create an account
          </h1>
          <p className="text-sm text-gray-400">
            Enter your information below to create your account
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name" className="text-white">
                First name
              </Label>
              <Input
                id="first_name"
                {...register("first_name")}
                placeholder="John"
                className="bg-transparent border-gray-800 text-white placeholder:text-gray-600"
              />
              {errors.first_name && (
                <p className="text-xs text-red">{errors.first_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name" className="text-white">
                Last name
              </Label>
              <Input
                id="last_name"
                {...register("last_name")}
                placeholder="Doe"
                className="bg-transparent border-gray-800 text-white placeholder:text-gray-600"
              />
              {errors.last_name && (
                <p className="text-xs text-red">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="john.doe@example.com"
              className="bg-transparent border-gray-800 text-white placeholder:text-gray-600"
            />
            {errors.email && (
              <p className="text-xs text-red">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              {...register("password")}
              className="bg-transparent border-gray-800 text-white"
            />
            {errors.password && (
              <p className="text-xs text-red">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password" className="text-white">
              Confirm password
            </Label>
            <Input
              id="confirm_password"
              type="password"
              {...register("confirm_password")}
              className="bg-transparent border-gray-800 text-white"
            />
            {errors.confirm_password && (
              <p className="text-xs text-red">
                {errors.confirm_password.message}
              </p>
            )}
          </div>

          {error && (
            <Alert
              variant="destructive"
              className="bg-red-900/20 border-red-900 text-red-300"
            >
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-900/20 border-green-900 text-green-300">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full bg-red text-white hover:bg-white hover:text-true-black transition-colors"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create account"
            )}
          </Button>
        </form>

        <div className="text-center text-sm">
          <span className="text-gray-400">Already have an account? </span>
          <Link
            href="/auth/login"
            className="text-white hover:underline underline-offset-4 hover:text-red"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
