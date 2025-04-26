// TimeRangeSelector

import { Button } from "@/components/ui/button";
import { useState } from "react";
import WhiteCalendar from "../../public/white-calendar.svg";
import Image from "next/image";

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
    <div className="flex justify-center space-x-2 mb-4 bg-black w-max rounded">
      <div className="flex justify-center my-1 ml-2">
        <Image
          src={WhiteCalendar}
          alt="Calendar Icon"
          width={24}
          height={24}
          className="w-6 h-6"
        />
      </div>
      {["W", "M", "YTD", "Y"].map((range) => (
        <Button
          key={range}
          variant={selectedRange === range ? "default" : "outline"}
          onClick={() => handleRangeChange(range)}
          className={`text-white no-border hover:bg-white ${
            selectedRange === range ? "bg-red" : "bg-black"
          } hover:text-true-black`}
        >
          {range}
        </Button>
      ))}
    </div>
  );
}
