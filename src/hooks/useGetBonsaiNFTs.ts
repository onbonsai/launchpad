import { useQuery } from "@tanstack/react-query"

const BONSAI_MIRROR_POLYGON = "0xE9d2FA815B95A9d087862a09079549F351DaB9bd"
const BONSAI_MIRROR_ZKSYNC = "0x40df0F8C263885093DCCEb4698DE3580FC0C9D49"
const BONSAI_MIRROR_BASE = "0xf060fd6b66B13421c1E514e9f10BedAD52cF241e"

const BONSAI_MIRRORS = {
  "base": BONSAI_MIRROR_BASE,
  "zkSync": BONSAI_MIRROR_ZKSYNC,
  "polygon": BONSAI_MIRROR_POLYGON
};

const getApiUrl = (
  alchemyApiKey: string,
  address: string,
  network: string,
  contractAddresses?: string[]
) => {
  const baseUrl = (networkName: string) =>
    `https://${networkName}-mainnet.g.alchemy.com/nft/v3/${alchemyApiKey}/getNFTsForOwner?owner=${address}&withMetadata=true&orderBy=transferTime&pageSize=100`

  const contractParam = contractAddresses?.length
    ? contractAddresses.map((addr) => `&contractAddresses[]=${addr}`).join("")
    : ""

  const networkName = network === "zkSync" ? "zksync" : network;
  return baseUrl(networkName) + contractParam
}

const getOpenSeaUrl = (address: string, tokenId, network) => {
  if (network === "polygon") {
    return `https://opensea.io/assets/matic/${address}/${tokenId}`
  }

  if (network === "base") {
    return `https://opensea.io/assets/base/${address}/${tokenId}`
  }

  if (network === "zksync") {
    return undefined // opensea not supporting zksync
  }

  return `https://opensea.io/assets/matic/${address}/${tokenId}`
}

const getOwnedNFTs = async (alchemyApiKey, address, network, contractAddresses) => {
  const options = { method: "GET", headers: { accept: "application/json" } }
  const api_url = getApiUrl(alchemyApiKey, address, network, contractAddresses)
  const response = await fetch(api_url, options)
  const data = await response.json()
  return data.ownedNfts.map((nft) => ({
    ...nft,
    tokenId: nft.tokenId ? Number(nft.tokenId) : Number.parseInt(nft.id.tokenId, 16),
    network,
    openseaUrl: getOpenSeaUrl(
      nft.contract.address,
      nft.tokenId ? Number(nft.tokenId) : Number.parseInt(nft.id.tokenId, 16),
      network
    ),
  }))
}

export const useGetBonsaiNFTs = (address?: `0x${string}`) => {
  return useQuery({
    queryKey: ["all-nfts-combined", address],
    queryFn: async () => {
      try {
        const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
        if (!alchemyApiKey) return []

        const [polygon, base, zkSync] = await Promise.all(
          ["polygon", "base", "zkSync"].map(async (network) =>
            getOwnedNFTs(alchemyApiKey, address, network, [BONSAI_MIRRORS[network]])
          )
        )

        return []
          .concat(polygon, base, zkSync)
          .sort(
            (a: any, b: any) =>
              (b.contract?.symbol === "BONSAI" ? 1 : 0) - (a.contract?.symbol === "BONSAI" ? 1 : 0)
          ) as any[];
      } catch (error) {
        console.log(error)
        return []
      }
    },
    enabled: !!address,
  })
}
