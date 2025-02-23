"use client";

import { useState, useEffect } from "react";
import * as z from "zod";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";

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
  const { status } = useSession();
  const params = useParams();
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<
    { _id: string; symbol: string; name: string; currency: string }[]
  >([]);
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
          router.push("/portfolio");
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
      return;
    }

    const fetchAssets = async () => {
      try {
        const response = await fetch(`/api/assets/search?query=${searchQuery}`);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data);
        }
      } catch (error) {
        console.error("Error fetching assets:", error);
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
      const response = await fetch("/api/transaction/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          portfolio_id: params.id,
          asset_id: selectedAsset._id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError("Failed to add transaction: " + result.error);
        console.error(result.error);
        return;
      }

      reset();
      setError(null);
      setTimeout(() => {
        router.push(`/portfolio/`);
      }, 1000);
    } catch (error) {
      setError("Error adding transaction.");
      console.error(error);
      return;
    }
  };

  console.log(errors);
  console.log(selectedAsset);

  if (status === "loading" || isPortfolioOwner === null)
    return <p>Loading...</p>;

  return (
    <div>
      <h1>Add Transaction</h1>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label>Search Asset</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for an asset by a symbol or name"
          />
          {searchResults.length > 0 && (
            <ul>
              {searchResults.map((asset) => (
                <li
                  key={asset._id}
                  onClick={() => {
                    setSelectedAsset(asset);
                    setSearchQuery(asset.symbol);
                    setSearchResults([]); //Hide the results after selection
                    setValue("asset_id", asset._id);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {asset.symbol} - {asset.name}
                </li>
              ))}
            </ul>
          )}
        </div>
        {selectedAsset && (
          <p>
            <strong>Selected Stock: </strong> {selectedAsset.symbol} -{" "}
            {selectedAsset.name}
          </p>
        )}

        <div>
          <label>Transaction Type</label>
          <select {...register("tx_type")}>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
        </div>

        <div>
          <label>Quantity</label>
          <input
            type="number"
            {...register("quantity", { valueAsNumber: true })}
          />
          {errors.quantity && (
            <p className="text-red-500">{errors.quantity.message}</p>
          )}
        </div>

        <div>
          <label>Price Per Unit</label>
          <input
            type="number"
            {...register("price_per_unit", { valueAsNumber: true })}
          />
          {errors.price_per_unit && (
            <p className="text-red-500">{errors.price_per_unit.message}</p>
          )}
        </div>

        <div>
          <label>Currency</label>
          <select
            {...register("currency")}
            defaultValue={selectedAsset?.currency || ""}
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

        <div>
          <label>Date</label>
          <input
            type="date"
            {...register("tx_date")}
            onChange={(e) => setValue("tx_date", e.target.value)}
          />
        </div>

        {errors && <p className="text-red-500">{error}</p>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Adding transaction..." : "Add Transaction"}
        </button>
      </form>
    </div>
  );
}
