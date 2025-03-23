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
import { signOut } from "next-auth/react";

const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required to confirm deletion"),
});

type DeleteAccountFormData = z.infer<typeof deleteAccountSchema>;

interface DeleteAccountFormProps {
  onClose: () => void;
}

export function DeleteAccountForm({ onClose }: DeleteAccountFormProps) {
  const form = useForm<DeleteAccountFormData>({
    resolver: zodResolver(deleteAccountSchema),
  });

  const onSubmit = async (data: DeleteAccountFormData) => {
    try {
      const response = await fetch("/api/user/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: data.password }),
      });

      if (!response.ok) {
        const error = await response.json();
        form.setError("root", { message: error.error });
        return;
      }

      await signOut({ callbackUrl: "/" });
    } catch (error) {
      console.error("Error deleting account:", error);
      form.setError("root", {
        message: String(error) || "Failed to delete account",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.formState.errors.root && (
          <p className="text-red-500 text-sm">
            {form.formState.errors.root.message}
          </p>
        )}
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="destructive"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Deleting..." : "Delete Account"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
