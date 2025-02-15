"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IPortfolio } from "@/models/Portfolio";
import { useSession } from "next-auth/react";


export default function Page() {
    const [portfolios, setPortfolios] = useState<IPortfolio[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const [unauthorized, setUnauthorized] = useState(false);
    const { data: session } = useSession();


    useEffect(() => {
        const fetchPortfolios = async () => {
            try{
                const response = await fetch("/api/portfolio");
                
                if (response.status === 401){
                    setUnauthorized(true);
                    setTimeout(() => {
                        router.push("/auth/login");
                    }, 3000);
                    return;
                }

                const data: IPortfolio[] = await response.json();
                setPortfolios(data ?? []);

            } catch (error) {
                console.error("Error fetching portfolios:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPortfolios()
            .then(() => {})
            .catch(error => console.error("Error fetching portfolios:"+ error));

    }, [router]);

    if (unauthorized) {
        return (
            <div>
                <h1>Unauthorized access.</h1>
                <p>Redirecting to login page</p>
            </div>
        )
    }

    if (loading) return <p>Loading...</p>;

    return (
        <div>
            <h1>Hi { (session?.user as { first_name?: string })?.first_name || "User"} Your portfolios</h1>
            {portfolios.length > 0 ?  (
                <ul>
                    {portfolios.map((portfolio : IPortfolio) => (
                        <li key={portfolio._id.toString()}>
                            <strong>{portfolio.name}</strong> { portfolio.description ?  " - " + portfolio.description : ""}
                        </li>
                    ))}
                </ul>
            ) : (
                <p>You don&#39;t have any portfolios yet.</p>
            )}
            <button onClick={() => router.push("/portfolio/add")}>
                Add portfolio
            </button>
        </div>
    );

}