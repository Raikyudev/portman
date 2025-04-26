// Add transaction button component

"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface AddTransactionButtonProps {
  portfolioId?: string;
  isEnabled: boolean;
}

export default function AddTransactionButton({
  portfolioId,
  isEnabled,
}: AddTransactionButtonProps) {
  const router = useRouter();

  // Handle button click to navigate to add transaction page
  const handleAddTransaction = () => {
    if (portfolioId && isEnabled) {
      router.push(`/portfolio/${portfolioId}/add-transaction`);
    }
  };

  return (
    <Button
      disabled={!isEnabled || !portfolioId}
      variant="default"
      className="bg-red hover:bg-white hover:text-true-black text-white"
      onClick={handleAddTransaction}
    >
      Add Transaction
    </Button>
  );
}
