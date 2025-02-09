"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";

const signUpSchema = z.object({
    first_name: z.string().min(2, "First name must be at least 2 characters"),
    last_name: z.string().min(2, "Last name must be at least 2 characters"),
    username: z.string().min(4, "Username must be at least 4 characters"),
    email: z.string().email("Invalid email"),
    password: z.string().min(5, "Password must be at least 5 characters"),
    confirm_password: z.string().min(5, "Password must be at least 5 characters"),
}).refine((data) => data.password === data.confirm_password, {
    message: "Passwords must match",
    path: ["confirm_password"],
});

type SignUpFormData = z.infer<typeof signUpSchema>;

export default function Page(){
    const router = useRouter();

    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: {errors, isSubmitting},
        reset,
    } = useForm<SignUpFormData>({
        resolver: zodResolver(signUpSchema),
    });

    const onSubmit = async (data: SignUpFormData) => {
        setError(null);
        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (response.ok) {
                setError("Sign up successful! Redirecting to login...");
                setTimeout(() => {
                    reset();
                    router.push("/auth/login");
                }, 3000);

            } else {
                setError(result.error);
            }
        } catch {
            setError("Can't connect to the server. Please try again later.");
        }

    };

    return (
        <div>
            <h2>Sign Up</h2>

            <form onSubmit={handleSubmit(onSubmit)}>

                <div>
                    <label>First Name</label>
                    <input {...register("first_name")} />
                    {errors.first_name && <p className="text-red-500">{errors.first_name.message}</p>}
                </div>

                <div>
                    <label>Last Name</label>
                    <input {...register("last_name")} />
                    {errors.last_name && <p className="text-red-500">{errors.last_name.message}</p>}
                </div>

                <div>
                    <label>Username</label>
                    <input
                        {...register("username")}
                    />
                    {errors.username && <p className="text-red-500">{errors.username.message}</p>}
                </div>

                <div>
                    <label>Email</label>
                    <input
                        type="email"
                        {...register("email")}
                    />
                    {errors.email && <p className="text-red-500">{errors.email.message}</p>}
                </div>

                <div>
                    <label>Password</label>
                    <input
                        type="password"
                        {...register("password")}
                        autoComplete="new-password"
                    />
                    {errors.password && <p className="text-red-500">{errors.password.message}</p>}
                </div>

                <div>
                    <label>Confirm Password</label>
                    <input
                        type="password"
                        {...register("confirm_password")}
                        autoComplete="new-password"
                    />
                    {errors.confirm_password && <p className="text-red-500">{errors.confirm_password.message}</p>}
                </div>
                {error && <p className="text-red-500">{error}</p>}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    >
                    {isSubmitting ? "Signing up..." : "Sign Up"}
                </button>
            </form>
        </div>

    );
}
