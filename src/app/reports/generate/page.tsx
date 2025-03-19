"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ProtectedLayout from "@/app/ProtectedLayout";
import PortfolioDropdown from "@/components/PortfolioDropdown";
import { IExtendedPortfolio } from "@/types/portfolio";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

// Define the validation schema with Zod
const formSchema = z
  .object({
    name: z.string().min(1, "Report name is required"),
    type: z.string().min(1, "Report type is required"),
    selectedPortfolio: z.string().optional(),
    format: z.enum(["pdf", "json"]).default("pdf"),
    dateRange: z
      .object({
        from: z
          .date()
          .refine((date) => !date || date <= new Date(), {
            message: "Start date cannot be in the future",
          })
          .optional(),
        to: z
          .date()
          .refine((date) => date <= new Date(), {
            message: "End date cannot be in the future",
          })
          .optional(),
      })
      .refine(
        (data) => {
          if (!data.from || !data.to) return true;
          return data.to >= data.from;
        },
        {
          message: "End date must be after start date",
          path: ["to"],
        },
      ),
  })
  .refine(
    (data) => {
      // Require dateRange.to for all report types except summary (which sets it automatically)
      return data.type === "summary" || !!data.dateRange?.to;
    },
    {
      message: "A date or date range end date is required",
      path: ["dateRange"],
    },
  );

export default function Page() {
  const [portfolios, setPortfolios] = useState<IExtendedPortfolio[]>([]);
  const [loadingPortfolios, setLoadingPortfolios] = useState(true);

  const reportTypes = [
    { value: "income_report", label: "Income Report" },
    { value: "portfolio_report", label: "Portfolio Report" },
    { value: "summary", label: "Summary" },
  ];

  const formatOptions = [
    { value: "pdf", label: "PDF" },
    { value: "json", label: "JSON" },
  ];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "",
      selectedPortfolio: "",
      format: "pdf",
      dateRange: { from: undefined, to: undefined },
    },
  });

  const requiresPortfolio = form.watch("type") === "portfolio_report";
  const isSummary = form.watch("type") === "summary";

  // Automatically set dateRange for summary report
  useEffect(() => {
    if (isSummary) {
      const today = new Date();
      form.setValue("dateRange", {
        from: undefined, // Will be set to one year prior in the API
        to: today,
      });
    }
  }, [isSummary, form]);

  useEffect(() => {
    const fetchPortfolios = async () => {
      setLoadingPortfolios(true);
      try {
        const response = await fetch("/api/user-portfolios", {
          credentials: "include",
        });
        if (!response.ok) {
          console.error("Error fetching portfolios");
          return;
        }
        const data = await response.json();
        setPortfolios(data.portfolios || []);
      } catch (error) {
        console.error("Error fetching portfolios:", error);
      } finally {
        setLoadingPortfolios(false);
      }
    };
    fetchPortfolios();
  }, []);

  const handleGenerateReport = async (values: z.infer<typeof formSchema>) => {
    try {
      console.log("Form values:", values);

      let selectedPortfolios: string[];

      if (requiresPortfolio && values.selectedPortfolio) {
        selectedPortfolios = [values.selectedPortfolio];
      } else {
        const response = await fetch("/api/user-portfolios", {
          credentials: "include",
        });
        if (!response.ok) {
          console.error("Failed to fetch user portfolios");
        }
        const data = await response.json();
        if (!data.portfolios || data.portfolios.length === 0) {
          console.error("No portfolios found for the user");
        }
        selectedPortfolios = data.portfolios.map(
          (portfolio: IExtendedPortfolio) => portfolio._id.toString(),
        );
      }

      if (!values.name) {
        console.error("Report name is required");
      }

      const payload = {
        selectedPortfolios,
        type: values.type,
        format: values.format,
        dateRange: values.dateRange,
        name: values.name,
      };

      console.log("Sending payload to /api/reports/generate:", payload);

      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error response:", errorData);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      const fileNameMatch = contentDisposition?.match(/filename="(.+)"/);
      const fileName = fileNameMatch
        ? fileNameMatch[1]
        : `${values.type}-report.${values.format}`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log("Report generated successfully:", fileName);
    } catch (error) {
      console.error("Error generating report:", error);
      alert(`Failed to generate report: ` + error);
    }
  };

  useEffect(() => {
    if (requiresPortfolio && portfolios.length > 0) {
      form.setValue("selectedPortfolio", portfolios[0]._id.toString());
    }
  }, [requiresPortfolio, portfolios, form]);

  return (
    <ProtectedLayout>
      <div className="p-6 bg-true-black rounded-xl">
        <div className="w-[90%] mx-auto min-w-[600px] max-w-[1200px] bg-true-black">
          <Card className="bg-true-black no-border w-full">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">
                Generate Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleGenerateReport)}
                  className="space-y-6"
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-6">
                      {/* Name */}
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter report name"
                                className="bg-background border-border text-foreground"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Report Type */}
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Report Type</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="bg-background border-border text-foreground">
                                  <SelectValue placeholder="Select report type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background border-border text-foreground">
                                {reportTypes.map((reportType) => (
                                  <SelectItem
                                    key={reportType.value}
                                    value={reportType.value}
                                  >
                                    {reportType.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Portfolio Selection */}
                      {requiresPortfolio && !loadingPortfolios && (
                        <FormField
                          control={form.control}
                          name="selectedPortfolio"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Select Your Portfolio</FormLabel>
                              <FormControl>
                                <PortfolioDropdown
                                  portfolios={portfolios}
                                  onPortfolioSelect={field.onChange}
                                  initialPortfolioId={portfolios[0]?._id.toString()}
                                  create={false}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {/* Date Selection (only for non-summary reports) */}
                      {!isSummary && (
                        <FormField
                          control={form.control}
                          name="dateRange"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date Range</FormLabel>
                              <FormControl>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "w-full justify-start text-left font-normal bg-background border-border text-foreground",
                                        !field.value?.from &&
                                          "text-muted-foreground",
                                      )}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {field.value?.from ? (
                                        field.value.to ? (
                                          <>
                                            {format(
                                              field.value.from,
                                              "dd/MM/yyyy",
                                            )}{" "}
                                            -{" "}
                                            {format(
                                              field.value.to,
                                              "dd/MM/yyyy",
                                            )}
                                          </>
                                        ) : (
                                          format(field.value.from, "dd/MM/yyyy")
                                        )
                                      ) : (
                                        <span>Pick a date range</span>
                                      )}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-auto p-0 bg-background border-border"
                                    align="start"
                                  >
                                    <Calendar
                                      initialFocus
                                      mode="range"
                                      defaultMonth={field.value?.from}
                                      selected={field.value as DateRange}
                                      onSelect={(
                                        range: DateRange | undefined,
                                      ) => {
                                        field.onChange(range);
                                      }}
                                      disabled={{ after: new Date() }}
                                      numberOfMonths={2}
                                      modifiers={{ today: new Date() }}
                                      modifiersClassNames={{
                                        today: "border-2 border-red rounded",
                                      }}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {/* Format Selection */}
                      <FormField
                        control={form.control}
                        name="format"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Format</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="bg-background border-border text-foreground">
                                  <SelectValue placeholder="Select format" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background border-border text-foreground">
                                {formatOptions.map((formatOption) => (
                                  <SelectItem
                                    key={formatOption.value}
                                    value={formatOption.value}
                                  >
                                    {formatOption.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg w-full"
                  >
                    Generate Report
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedLayout>
  );
}
