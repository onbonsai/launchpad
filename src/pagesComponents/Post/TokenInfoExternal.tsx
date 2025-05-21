import clsx from "clsx";
import { formatUnits } from "viem";
import { ReactNode, useState, useEffect } from "react";
import { Subtitle, BodySemiBold, Header2 } from "@src/styles/text";
import { DECIMALS, USDC_CONTRACT_ADDRESS, USDC_DECIMALS } from "@src/services/madfi/moneyClubs";
import { Button } from "@src/components/Button";
import { useAccount, useReadContract } from "wagmi";
import { SmartMedia } from "@src/services/madfi/studio";
import { capitalizeFirstLetter, kFormatter } from "@src/utils/utils";
import { brandFont } from "@src/fonts/fonts";
import BuyUSDCWidget from "@pagesComponents/Club/BuyUSDCWidget";
import dynamic from "next/dynamic";
import { erc20Abi } from "viem";
import { fetchTokenMetadata } from "@src/utils/tokenMetadata";
import WalletButton from "@src/components/Creators/WalletButton";
import { sdk } from '@farcaster/frame-sdk'
import { useIsMiniApp } from "@src/hooks/useIsMiniApp";
import { SafeImage } from "@src/components/SafeImage/SafeImage";

const BuySellModal = dynamic(() => import("@pagesComponents/Club/BuySellModal"), { ssr: false });

interface Token {
  address: `0x${string}`;
  chain: string;
  external: boolean;
}

interface TokenMetadata {
  name: string;
  symbol: string;
  logo: string;
  decimals: number;
}

export const TokenInfoExternal = ({ token, postId }: { token: Token; postId?: string }) => {
  const { address, isConnected } = useAccount();
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyUSDCModalOpen, setBuyUSDCModalOpen] = useState(false);
  const [usdcBuyAmount, setUsdcBuyAmount] = useState<string>("");
  const [usdcAmountNeeded, setUsdcAmountNeeded] = useState<number>(0);
  const [tokenMetadata, setTokenMetadata] = useState<TokenMetadata | null>(null);
  const _DECIMALS = token.chain === "lens" ? DECIMALS : USDC_DECIMALS;
  const { isMiniApp } = useIsMiniApp();

  // Fetch token metadata
  useEffect(() => {
    const getMetadata = async () => {
      const metadata = await fetchTokenMetadata(token.address, token.chain as "lens" | "base");
      if (metadata) {
        setTokenMetadata({
          name: metadata.name,
          symbol: metadata.symbol,
          logo: metadata.logo,
          decimals: metadata.decimals,
        });
      }
    };
    getMetadata();
  }, [token.address, token.chain]);

  // Get token balance
  const { data: tokenBalance } = useReadContract({
    address: token.address,
    abi: erc20Abi,
    chainId: token.chain === "lens" ? 137 : 8453, // Lens is on Polygon (137), Base is 8453
    functionName: "balanceOf",
    args: [address!],
    query: {
      refetchInterval: 10000,
      enabled: isConnected,
    },
  });

  const buyOnClick = async () => {
    if (isMiniApp) {
      const chainId = token.chain === "lens" ? "232" : "8453";
      await sdk.actions.swapToken({
        sellToken: `eip155:${chainId}/native`,
        buyToken: `eip155:${chainId}/erc20:${token.address}`,
        sellAmount: token.chain === "lens" ? "10000000000000000000" : "10000000",
      })
    } else if (token.chain === "base") {
      window.open(`https://matcha.xyz/tokens/base/${token.address}?sellChain=8453&sellAddress=${USDC_CONTRACT_ADDRESS}`, "_blank");
    } else {
      setShowBuyModal(true);
    }
  }

  const InfoCard: React.FC<{
    title?: string;
    subtitle: ReactNode;
    roundedLeft?: boolean;
    roundedRight?: boolean;
    className?: string;
  }> = ({ title, subtitle, roundedLeft, roundedRight, className }) => (
    <div
      className={clsx(
        "min-w-[88px] flex flex-col items-center justify-center border border-card-light py-2 gap-y-1 px-4 bg-card-light",
        roundedLeft && "rounded-l-xl",
        roundedRight && "rounded-r-xl sm:rounded-none",
        className || "",
      )}
    >
      {title ? (
        <>
          <Subtitle className="text-xs whitespace-nowrap">{title}</Subtitle>
          <span>{subtitle}</span>
        </>
      ) : (
        <div className="h-8 flex items-center">
          <span>{subtitle}</span>
        </div>
      )}
    </div>
  );

  const ActionCard: React.FC<{ onClick: (e: any) => void }> = ({ onClick }) => (
    <div className="min-w-[88px] flex flex-col items-center justify-center border border-card-light py-2 space-y-1 px-4 bg-card-light rounded-l-xl sm:rounded-l-none rounded-r-xl hover:!bg-bullish cursor-pointer transition-colors duration-200 ease-in-out">
      <div className="h-8 flex items-center pt-1">
        <Button
          variant="dark-grey"
          size="md"
          onClick={onClick}
          disabled={!isConnected}
          className={`!bg-transparent hover:!bg-transparent !border-none !text-white/80 ${brandFont.className}`}
        >
          Buy
        </Button>
      </div>
      {/* filler to match height of infocard */}
      <div></div>
    </div>
  );

  return (
    <div className="md:col-span-3s rounded-3xl animate-fade-in-down">
      <div className="relative w-full h-[190px] md:h-[63px] rounded-t-3xl bg-true-black overflow-hidden bg-clip-border">
        <div className="absolute inset-0" style={{ filter: "blur(40px)" }}>
          <SafeImage
            src={tokenMetadata?.logo || "/unknown-logo.jpg"}
            alt={tokenMetadata?.name || "Token"}
            className="w-full h-full object-cover"
            fill
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-true-black to-transparent" />

        <div className="relative z-10 p-2 pb-4 flex flex-col">
          <div className="flex flex-col gap-2 justify-between items-center w-full">
            {/* Token Info Row */}
            <div className="w-full">
              <div className='flex items-center gap-x-4 w-full'>
                <SafeImage
                  src={tokenMetadata?.logo || "/unknown-logo.jpg"}
                  alt={tokenMetadata?.name || "Token"}
                  className="object-cover rounded-lg"
                  width={48}
                  height={48}
                />
                <div className="flex flex-col items-start">
                  <Header2 className="text-white text-md">${tokenMetadata?.symbol}</Header2>
                  <BodySemiBold className="text-white/60 text-sm">{tokenMetadata?.name}</BodySemiBold>
                </div>
              </div>
            </div>

            {/* Info Cards Row */}
            <div className="flex flex-row items-center w-full">
              <InfoCard
                title="Chain"
                subtitle={
                  <div className="flex gap-1 items-center">
                    <SafeImage
                      src={`/${token.chain}.png`}
                      alt={token.chain}
                      className="opacity-7 w-auto"
                      height={12}
                      width={12}
                    />
                    <Subtitle className="text-white">{capitalizeFirstLetter(token.chain)}</Subtitle>
                  </div>
                }
                roundedLeft
                className="flex-1"
              />
              <InfoCard
                title="CA"
                subtitle={
                  <div className="flex gap-1 items-center">
                    <WalletButton wallet={token.address!} onlyFirst length={6} />
                  </div>
                }
                className="flex-1"
              />
              <InfoCard
                title="Balance"
                subtitle={
                  <Subtitle>
                    {!tokenBalance
                      ? "-"
                      : kFormatter(parseFloat(formatUnits(tokenBalance, tokenMetadata?.decimals || 18)))}
                  </Subtitle>
                }
                roundedRight
                className="flex-1"
              />
            </div>

            {/* Action Card Row */}
            <div className="w-full mt-1">
              <ActionCard onClick={buyOnClick} />
            </div>
          </div>
        </div>

        <BuySellModal
          club={{
            clubId: '0', // Required for useGetClubBalance
            chain: token.chain,
            token: {
              symbol: tokenMetadata?.symbol || "",
              name: tokenMetadata?.name || "",
              image: tokenMetadata?.logo || "/unknown-logo.jpg",
            },
            tokenAddress: token.address,
            complete: true, // Required for trading
            supply: "0", // Required for trading
            currentPrice: "0", // Required for trading
            createdAt: new Date().toISOString(), // Required for TradeComponent
            initialPrice: "0", // Required for BuySellWidget
            targetPriceMultiplier: "1", // Required for BuySellWidget
            flatThreshold: "0", // Required for BuySellWidget
          }}
          address={address as string}
          open={showBuyModal}
          onClose={() => {
            setShowBuyModal(false);
          }}
          onBuyUSDC={(amount: string) => {
            setUsdcBuyAmount(amount);
            setUsdcAmountNeeded(parseFloat(amount));
            setShowBuyModal(false);
            setBuyUSDCModalOpen(true);
          }}
          postId={postId}
        />
        <BuyUSDCWidget
          open={buyUSDCModalOpen}
          buyAmount={usdcBuyAmount}
          onClose={() => {
            setBuyUSDCModalOpen(false);
            setShowBuyModal(true);
          }}
          chain={token.chain || "lens"}
        />
      </div>
    </div>
  );
};
