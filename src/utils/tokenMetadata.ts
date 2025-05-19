const LENS_ALCHEMY_URL = `https://lens-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`;
const BASE_ALCHEMY_URL = `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`;

const LOGO_PLACEHOLDER = "https://link.storjshare.io/raw/jvyvfodxg4mej4tk32buvragnvza/token-images/unknown-logo.jpg";

export const fetchTokenMetadata = async (tokenAddress: string, network: "lens" | "base") => {
  try {
    const response = await fetch(network === "lens" ? LENS_ALCHEMY_URL : BASE_ALCHEMY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "alchemy_getTokenMetadata",
        params: [tokenAddress],
        id: 1,
      }),
    });

    const data = await response.json();

    if (data.result.name) {
      return {
        ...data.result,
        logo: data.result.logo || LOGO_PLACEHOLDER,
        network,
      };
    }
    return null;
  } catch (error) {
    console.error(`Error fetching token metadata from ${network}:`, error);
    return null;
  }
};
