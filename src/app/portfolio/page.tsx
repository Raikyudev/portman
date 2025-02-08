export default async function Page(){
    const fetchAssets = async () => {
        const response = await fetch("http://localhost:3000/api/assets");
        return await response.json();
    }

    const assets = await fetchAssets();
    console.log(assets);
    return (
        <div>
            <h1>Assets</h1>
            {assets.map((asset: { _id: string; name: string; symbol: string; asset_type: string; currency: string; price: number }) => (
                <div key={asset._id}>
                    <h2>{asset.name}</h2>
                    <p>{asset.symbol}</p>
                    <p>{asset.asset_type}</p>
                    <p>{asset.currency + " " + asset.price}</p>

                </div>
            ))}
        </div>
    )
}