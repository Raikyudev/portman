import { Button } from "@/components/ui/button";
import { useState } from "react";

interface TimeRangeSelectorProps {
  onRangeChange: (range: string) => void;
  initialRange?: string;
}

export default function TimeRangeSelector({
  onRangeChange,
  initialRange = "YTD",
}: TimeRangeSelectorProps) {
  const [selectedRange, setSelectedRange] = useState(initialRange);

  const handleRangeChange = (range: string) => {
    setSelectedRange(range);
    onRangeChange(range);
  };

  return (
    <div className="flex space-x-2 mb-4">
      {["W", "M", "YTD", "Y"].map((range) => (
        <Button
          key={range}
          variant={selectedRange === range ? "default" : "outline"}
          onClick={() => handleRangeChange(range)}
          className={`text-white no-border ${selectedRange === range ? "bg-red" : "bg-black"} hover-none`}
        >
          {range}
        </Button>
      ))}
    </div>
  );
}
