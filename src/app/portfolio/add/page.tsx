"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { useSession } from "next-auth/react";

const portfolioSchema = z.object({
  name: z.string().min(3, "Portfolio name must be at least 3 characters long"),
  description: z.string().max(255, "Description is too long").optional(),
});

type PortfolioFormData = z.infer<typeof portfolioSchema>;

export default function Page() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { status } = useSession();
  useEffect(() => {
    if (status === "unauthenticated") {
      setTimeout(() => {
        router.push("/auth/login");
      }, 3000);
    }
  }, [status, router]);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PortfolioFormData>({
    resolver: zodResolver(portfolioSchema),
  });

  const onSubmit = async (data: PortfolioFormData) => {
    try {
      const response = await fetch("/api/portfolio/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) {
        setError("Failed to create the portfolio.");
        console.error(result.error);
        return;
      }
      reset();
      setTimeout(() => {
        router.push("/portfolio");
      }, 1000);
    } catch (error) {
      setError("Error creating portfolio.");
      console.error(error);
    }
  };
  if (status === "loading") {
    return <p>Loading...</p>;
  }

  if (status === "unauthenticated") {
    return (
      <div>
        <h1>Unauthorized access.</h1>
        <p>Redirecting to login page...</p>
      </div>
    );
  }
  return (
    <div>
      <h1>Add portfolio</h1>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label>Portfolio Name</label>
          <input
            {...register("name")}
            className={"bg-black border-red rounded-lg"}
          />
          {errors.name && <p className="text-red">{errors.name.message}</p>}
        </div>

        <div>
          <label>Description (Optional)</label>
          <textarea
            className={"bg-black border border-red rounded-lg mt-4"}
            {...register("description")}
          />
          {errors.description && (
            <p className="text-red">{errors.description.message}</p>
          )}
        </div>
        {error && <p className="text-red">{error}</p>}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating portfolio..." : "Create portfolio"}
        </button>
      </form>
    </div>
  );
}
