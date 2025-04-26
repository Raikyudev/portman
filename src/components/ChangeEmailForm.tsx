// Change Email Form component

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useSession, signIn } from "next-auth/react";

// Validation schema for email and password
const schema = z.object({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  password: z.string().min(1, "Password is required to confirm changes"),
});

type FormData = z.infer<typeof schema>;

interface ChangeEmailFormProps {
  onClose: () => void;
  initialData?: Partial<FormData>;
}

export function ChangeEmailForm({ onClose }: ChangeEmailFormProps) {
  const { update } = useSession();

  // Initialise form
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  // Handle form submit
  const onSubmit = async (data: FormData) => {
    try {
      const response = await fetch("/api/user/change-details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error(error.error);
        form.setError("root", { message: error.error });
      } else {
        const result = await response.json();

        // Update session after changing email
        await update({
          user: {
            email: result.user.email,
            name: `${result.user.first_name} ${result.user.last_name}`,
            id: result.user.id,
          },
        });

        // Re-sign in with the new email
        await signIn("credentials", {
          email: data.email,
          password: data.password,
          redirect: false,
        });
        onClose();
      }
    } catch (error) {
      console.error("Error updating email:", error);
      form.setError("root", {
        message: String(error) || "Failed to update email",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Enter email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Enter password to confirm"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.formState.errors.root && (
          <p className="text-red text-sm">
            {form.formState.errors.root.message}
          </p>
        )}
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
