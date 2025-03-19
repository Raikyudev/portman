// components/SearchBar.tsx

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
    <div className=" flex w-full max-w-md bg-black rounded-lg">
      <Input
        type="text"
        placeholder="Search assets..."
        value={localQuery}
        onChange={(e) => setLocalQuery(e.target.value)}
        onKeyDown={handleKeyDown} // Changed from onKeyPress to onKeyDown
        className="no-border flex-1 bg-black text-white"
      />
      <Button
        onClick={handleSearch}
        className="ml-2 bg-black hover:bg-red text-white"
      >
        <Search className="h-4 w-4" />
      </Button>
    </div>
  );
}
