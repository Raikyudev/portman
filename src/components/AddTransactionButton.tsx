// src/components/AddTransactionButton.tsx
"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

interface AddTransactionButtonProps {
  portfolioId?: string;
  isEnabled: boolean;
}

export default function AddTransactionButton({
  portfolioId,
  isEnabled,
}: AddTransactionButtonProps) {
  return (
    <Button
      asChild
      disabled={!isEnabled || !portfolioId}
      variant="default"
      className="bg-red-500 hover:bg-red-600 text-white"
    >
      <Link
        href={portfolioId ? `/portfolio/${portfolioId}/add-transaction` : "#"}
      >
        Add Transaction
      </Link>
    </Button>
  );
}
