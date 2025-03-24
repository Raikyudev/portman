"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import * as z from "zod";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";
import { getTodayDate } from "@/lib/utils";
import Image from "next/image";
import { Button } from "@/components/ui/button";

const transactionSchema = z.object({
  asset_id: z.string().min(1, "Please select a stock"),
  tx_type: z.enum(["buy", "sell"]),
  quantity: z.number().positive("Please enter a valid number"),
  price_per_unit: z.number().positive("Please enter a valid number"),
  currency: z.string().min(1, "Please select a currency"),
  tx_date: z.string(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

export default function Page() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const params = useParams();
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<
    { _id: string; symbol: string; name: string; currency: string }[]
  >([]);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [selectedAsset, setSelectedAsset] = useState<{
    _id: string;
    symbol: string;
    name: string;
    currency: string;
  } | null>(null);
  const [isPortfolioOwner, setIsPortfolioOwner] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      setTimeout(() => {
        router.push("/auth/login");
      }, 3000);
    }

    if (status === "loading") return;

    const checkOwnership = async () => {
      try {
        const response = await fetch(`/api/portfolio/validate?id=${params.id}`);
        if (response.status == 401) {
          router.push("/auth/login");
        }

        if (response.status === 403) {
          router.push("/portfolio?id=" + params.id);
        }

        setIsPortfolioOwner(true);
      } catch (error) {
        console.error("Error checking ownership:", error);
        setIsPortfolioOwner(false);
      }
    };

    checkOwnership().then(() => {});
  }, [status, params.id, router]);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setNotFound(false);
      return;
    }

    const fetchAssets = async () => {
      try {
        console.log("Fetching assets with query:", searchQuery);
        const response = await fetch(
          `/api/assets/search?query=${searchQuery}&limit=10&page=1`,
        );
        console.log("Response status:", response.status);
        if (response.ok) {
          const data = await response.json();
          console.log("API Response:", data);
          setSearchResults(data.assets || []);
          setError(null);
        } else {
          if (searchQuery.length >= 2) {
            console.error(
              "API request failed:",
              response.status,
              response.statusText,
            );
            setSearchResults([]);
            setNotFound(true);
          }
        }
      } catch (error) {
        console.error("Error fetching assets:", error);
        setSearchResults([]);
        setError("Error fetching assets. Please try again.");
      }
    };

    fetchAssets().then(() => {});
  }, [searchQuery]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      tx_date: new Date().toISOString().split("T")[0],
    },
  });

  useEffect(() => {
    if (selectedAsset) {
      reset((formValues) => ({
        ...formValues,
        currency: selectedAsset.currency,
      }));
    }
  }, [selectedAsset, reset]);

  const onSubmit = async (data: TransactionFormData) => {
    console.log("Data: " + data);
    if (!selectedAsset || !selectedAsset._id) {
      setError("Please select an asset");
      return;
    }

    try {
      const addResponse = await fetch("/api/transaction/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          portfolio_id: params.id,
          asset_id: selectedAsset._id,
        }),
      });

      const addResult = await addResponse.json();

      if (!addResponse.ok) {
        setError("Failed to add transaction: " + addResult.error);
        console.error("Transaction add error:", addResult.error);
        return;
      }
      const portfolioId = params.id;
      const txDate = data.tx_date;

      const deleteResponse = await fetch(
        `/api/portfolio-history/individual-delete?portfolio_id=${params.id}&date=${txDate}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        },
      );

      const deleteResult = await deleteResponse.json();
      console.log("Delete history result:", deleteResult);

      if (!deleteResponse.ok) {
        console.warn(
          "Delete failed, proceeding with save:",
          deleteResult.error,
        );
      }

      console.log("Params: ");
      console.log(params);
      console.log("PortfolioID: " + portfolioId + " Date: " + txDate + "");
      const saveResponse = await fetch(
        `/api/portfolio-history/individual-save`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            portfolio_id: portfolioId,
            fromDate: txDate,
            toDate: getTodayDate(),
            forceUpdate: true,
            userId: session?.user?.id,
          }),
        },
      );

      const saveResult = await saveResponse.json();
      console.log("Save history result:", saveResult);

      if (!saveResponse.ok) {
        setError("Failed to save history: " + saveResult.error);
        console.error("History save error:", saveResult.error);
        return;
      }

      reset();
      setError(null);

      router.push(`/portfolio?id=${params.id}`);
    } catch (error) {
      setError("Error processing transaction and history.");
      console.error("Overall error:", error);
      return;
    }
  };

  console.log(errors);
  console.log(selectedAsset);

  if (status === "loading" || isPortfolioOwner === null)
    return <p>Loading...</p>;

  return (
    <div>
      <Card className="bg-true-black w-[70vh] flex flex-col items-center">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Add Transaction</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-gray-800"
            aria-label="Go back to portfolio page"
            onClick={() => router.push(`/portfolio?id=${params.id}`)}
          >
            <Image
              src="/white-arrow.svg"
              alt="Back Arrow"
              width={32}
              height={32}
              className="bg-black hover:bg-red rounded-md"
            />
          </Button>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-2 grid-rows-6 gap-4 w-[50vh] min-h-[50vh] bg-true-black">
              <label className="col-span-1">Search Asset</label>
              <div className="col-span-1 relative">
                <input
                  className="no-border py-2 w-full"
                  type="text"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter stock symbol or name"
                />
                {searchResults.length > 0 ? (
                  <ul className="absolute bg-true-black border border-gray-700 mt-1 w-full max-h-40 overflow-y-auto z-10">
                    {searchResults.map((asset) => (
                      <li
                        key={asset._id}
                        onClick={() => {
                          setSelectedAsset(asset);
                          setSearchResults([]);
                          setValue("asset_id", asset._id);
                        }}
                        className="p-2 hover:bg-gray-800 cursor-pointer"
                      >
                        {asset.symbol} - {asset.name}
                      </li>
                    ))}
                  </ul>
                ) : searchQuery.length >= 2 && notFound ? (
                  <p className="text-red mt-1">No results found</p>
                ) : null}
              </div>

              {selectedAsset && (
                <p className="flex items-center col-span-2 bg-red rounded text-white p-2">
                  <strong>Selected Stock: </strong> {selectedAsset.symbol} -{" "}
                  {selectedAsset.name}
                </p>
              )}

              <label className="col-span-1">Transaction Type</label>
              <div className="col-span-1 flex flex-col">
                <select
                  {...register("tx_type")}
                  className="bg-black rounded py-2 w-full"
                >
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                </select>
              </div>

              <label className="col-span-1">Quantity</label>
              <div className="col-span-1 flex flex-col">
                <input
                  className="no-border py-2 w-full"
                  type="number"
                  {...register("quantity", { valueAsNumber: true })}
                />
                {errors.quantity && (
                  <p className="text-red">{errors.quantity.message}</p>
                )}
              </div>

              <label className="col-span-1">Price Per Unit</label>
              <div className="col-span-1 flex flex-col">
                <input
                  className="no-border py-2 w-full"
                  type="number"
                  {...register("price_per_unit", { valueAsNumber: true })}
                />
                {errors.price_per_unit && (
                  <p className="text-red">{errors.price_per_unit.message}</p>
                )}
              </div>

              <label className="col-span-1">Currency</label>
              <div className="col-span-1 flex flex-col">
                <select
                  {...register("currency")}
                  defaultValue={"USD"}
                  className="bg-black rounded py-2 w-full"
                >
                  <option value="" disabled>
                    Select a currency
                  </option>
                  {SUPPORTED_CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>

              <label className="col-span-1">Date</label>
              <div className="col-span-1 flex flex-col">
                <input
                  className="no-border py-2 w-full"
                  type="date"
                  {...register("tx_date")}
                  onChange={(e) => setValue("tx_date", e.target.value)}
                />
              </div>

              {error && <p className="col-span-2 text-red">{error}</p>}
            </div>

            <div className="flex justify-center items-center">
              <button
                className="bg-red text-white hover:text-true-black hover:bg-white p-3 rounded-lg"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Adding transaction..." : "Add Transaction"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
