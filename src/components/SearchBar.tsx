// components/SearchBar.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState } from "react";

interface SearchBarProps {
  query: string;
  setQuery: (query: string) => void;
  onSearch: () => void;
}

export default function SearchBar({
  query,
  setQuery,
  onSearch,
}: SearchBarProps) {
  const [localQuery, setLocalQuery] = useState(query);

  const handleSearch = () => {
    setQuery(localQuery);
    onSearch();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="mb-4 flex w-full max-w-md">
      <Input
        type="text"
        placeholder="Search assets..."
        value={localQuery}
        onChange={(e) => setLocalQuery(e.target.value)}
        onKeyDown={handleKeyDown} // Changed from onKeyPress to onKeyDown
        className="flex-1 bg-true-black text-white border-gray-700 focus:border-blue-500"
      />
      <Button
        onClick={handleSearch}
        className="ml-2 bg-blue-600 hover:bg-blue-700 text-white"
      >
        <Search className="h-4 w-4" />
      </Button>
    </div>
  );
}
