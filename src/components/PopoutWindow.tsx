"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button"; // Import shadcn Button component

interface PopoutWindowProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function PopoutWindow({
  isOpen,
  onClose,
  children,
}: PopoutWindowProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-40 bg-blur-overlay"
      onClick={onClose} // Close when clicking outside
    >
      <div
        className="w-[50%] h-[80vh] relative z-50 bg-black p-8 rounded-lg border-4 border-red"
        onClick={(e) => e.stopPropagation()} // Prevent click from closing modal
      >
        <div className="flex justify-end">
          {" "}
          {/* Flex container for button with margin-bottom */}
          <Button
            variant="ghost" // Use a ghost variant to match the minimal style
            className="text-white hover:text-white text-2xl"
            onClick={onClose}
          >
            X
          </Button>
        </div>
        <div className="bg-black">
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}
