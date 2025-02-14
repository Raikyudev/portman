"use client"; // Ensures this runs on the client-side

import { useState } from "react";

export default function FetchAssetsPage() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const fetchAssetsHandler = async () => {
        setLoading(true);
        setMessage("");

        try {
            const response = await fetch("/api/scripts/fetchAssets", {
                method: "GET",
            });

            const data = await response.json();
            if (response.ok) {
                setMessage(data.message);
            } else {
                setMessage(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error("Error fetching assets:", error);
            setMessage("Failed to fetch assets.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Fetch Assets</h1>
            <button
                onClick={fetchAssetsHandler}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-md"
            >
                {loading ? "Fetching..." : "Fetch Assets"}
            </button>
            {message && <p className="mt-4 text-lg">{message}</p>}
        </div>
    );
}
