"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

type TopGainer = {
  symbol: string;
  price: number;
  change: string;
};

interface TopGainersProps {
  topGainers: TopGainer[];
}

export default function TopGainers({ topGainers }: TopGainersProps) {
  return (
    <Card className="bg-true-black">
      <CardHeader>
          <CardTitle>Top Gainers Today</CardTitle>
      </CardHeader>
      <CardContent className="h-auto">
        <ScrollArea className="h-[calc(30vh-10px)] w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topGainers.length > 0 ? (
                topGainers.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.symbol}</TableCell>
                    <TableCell>${item.price.toLocaleString()}</TableCell>
                    <TableCell>{item.change}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3}>No data available</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
