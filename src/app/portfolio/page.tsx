"use client";

import {useCallback, useEffect, useState} from "react";
import { useRouter } from "next/navigation";
import { IPortfolio } from "@/models/Portfolio";
import { useSession } from "next-auth/react";
import { IPortfolioAsset } from "@/models/PortfolioAsset";


export default function Page() {
    const [portfolios, setPortfolios] = useState<IPortfolio[]>([]);
    const [portfolioAssets, setPortfolioAssets] = useState<{ [key: string]: IPortfolioAsset[] }>({});
    const [loading, setLoading] = useState(true);
    const [expandedPortfolio, setExpandedPortfolio] = useState<string | null>(null);
    const router = useRouter();
    const [unauthorized, setUnauthorized] = useState(false);
    const { data: session } = useSession();


    const fetchPortfolioAssets = useCallback( async (portfolioId: string) => {
        if(portfolioAssets[portfolioId]){
            return;
        }

        try{
            const response = await fetch(`/api/portfolio/assets?id=${portfolioId}`);

            if(!response.ok){
                console.error("Failed to fetch portfolio assets");
            }

            const assets: IPortfolioAsset[] = await response.json();
            setPortfolioAssets( prevState => ({
                ...prevState,
                [portfolioId]: assets,
            }));

        }catch (error) {
            console.error("Error fetching portfolio assets:", error);
        }

    }, [portfolioAssets]);

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

                if(data.length === 1){
                    setExpandedPortfolio(data[0]._id.toString());
                    await fetchPortfolioAssets(data[0]._id.toString());
                }

            } catch (error) {
                console.error("Error fetching portfolios:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPortfolios()
            .then(() => {})
            .catch(error => console.error("Error fetching portfolios:"+ error));



    }, [router, fetchPortfolioAssets]);


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
                            <strong>{portfolio.name}</strong>
                            { portfolio.description ?  " - " + portfolio.description : ""}
                            <div>
                                <button onClick={() => router.push(`/portfolio/${portfolio._id.toString()}/add-transaction`)}>
                                    Add Transaction
                                </button>
                            </div>
                            {expandedPortfolio === portfolio._id.toString() && (
                                <div>
                                    <h3>Assets</h3>
                                    {portfolioAssets[portfolio._id.toString()] ? (
                                        portfolioAssets[portfolio._id.toString()].length > 0 ? (
                                            <ul>
                                                {portfolioAssets[portfolio._id.toString()].map((asset) => (
                                                    <li key={asset._id.toString()}>
                                                        <strong>{(asset.asset_id  as { symbol: string })?.symbol}</strong> - {(asset.asset_id  as { name: string })?.name} <br />
                                                        <span>Quantity: {asset.quantity}</span> |
                                                        <span>Avg Buy Price: {asset.avg_buy_price} ({asset.currency})</span>
                                                    </li>
                                                ))}
                                            </ul>
                                    ) : (
                                        <p>No assets found in this portfolio</p>
                                        )
                                    ) : (
                                        <p>Loading assets...</p>
                                    )}

                                </div>
                            )}
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