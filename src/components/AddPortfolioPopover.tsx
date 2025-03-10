// src/components/AddPortfolioPopover.tsx
"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

const portfolioSchema = z.object({
  name: z.string().min(3, "Portfolio name must be at least 3 characters long"),
  description: z.string().max(255, "Description is too long").optional(),
});

type PortfolioFormData = z.infer<typeof portfolioSchema>;

interface AddPortfolioPopoverProps {
  trigger: React.ReactNode;
}

export default function AddPortfolioPopover({
  trigger,
}: AddPortfolioPopoverProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    reset,
  } = useForm<PortfolioFormData>({
    resolver: zodResolver(portfolioSchema),
    mode: "onChange",
  });

  const router = useRouter();

  const onSubmit = async (data: PortfolioFormData) => {
    setError(null);
    console.log("Submitting form with data:", data);
    try {
      console.log("Sending POST to /api/portfolio/add");
      const response = await fetch("/api/portfolio/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      console.log("API response:", result);

      if (!response.ok) {
        const errorMessage =
          result.error?.message || `HTTP error! Status: ${response.status}`;
        setError(errorMessage);
        console.log("Error occurred:", errorMessage);
        return;
      }

      // Successfully created portfolio
      console.log("New portfolio ID:", result._id);

      // Close the popover after callback
      setPopoverOpen(false);
      reset();

      router.push("/portfolio?id=" + result._id.toString());

      setTimeout(() => {
        window.location.reload();
      }, 1000); // Small delay to allow URL update
    } catch (error) {
      const errorMessage =
        (error as Error).message || "An unexpected error occurred.";
      setError(errorMessage);
      console.log("Error in onSubmit:", errorMessage);
      console.error("Error in onSubmit:", error);
    }
  };

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className="w-80 bg-true-black border border-red rounded-xl shadow-lg mt-4"
        aria-label="Create New Portfolio Form"
      >
        <div className="p-4">
          <h3 className="text-white text-lg font-semibold mb-4">
            Create New Portfolio
          </h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-white">
                Portfolio Name
              </Label>
              <Input
                id="name"
                {...register("name")}
                className="bg-true-black border border-red rounded-lg text-white"
                placeholder="Enter portfolio name"
                aria-describedby={errors.name ? "name-error" : undefined}
              />
              {errors.name && (
                <p id="name-error" className="text-red text-sm mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="description" className="text-white">
                Description (Optional)
              </Label>
              <Textarea
                id="description"
                {...register("description")}
                className="bg-true-black border border-red rounded-lg mt-2 text-white"
                placeholder="Enter description (optional)"
                aria-describedby={
                  errors.description ? "description-error" : undefined
                }
              />
              {errors.description && (
                <p id="description-error" className="text-red text-sm mt-1">
                  {errors.description.message}
                </p>
              )}
            </div>

            {error && <p className="text-red text-sm">{error}</p>}

            <Button
              type="submit"
              disabled={isSubmitting || !isValid}
              className="w-full bg-red text-white rounded-lg"
            >
              {isSubmitting ? "Creating portfolio..." : "Create portfolio"}
            </Button>
          </form>
        </div>
      </PopoverContent>
    </Popover>
  );
}
