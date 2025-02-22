import { useMemo, useState } from "react";
import { erc20Abi } from "viem";
import { useReadContract } from "wagmi";
import { sampleSize } from "lodash/collection";
import { useGetClubBalance, useGetBuyPrice, useGetClubHoldings } from "@src/hooks/useMoneyClubs";
import { USDC_CONTRACT_ADDRESS, CONTRACT_CHAIN_ID, WGHO_CONTRACT_ADDRESS } from "@src/services/madfi/moneyClubs";
import ProfilePics from "@src/components/ProfilePics/ProfilePics";
import { BuySellWidget } from "./BuySellWidget";
import { lens, lensTestnet } from "@src/services/madfi/utils";
import { IS_PRODUCTION } from "@src/services/madfi/utils";

export const TradeComponent = ({ club, address, onBuyUSDC, defaultBuyAmount }) => {
  const [friendCount, setFriendCount] = useState(0);
  const { data: clubBalance, refetch: refetchClubBalance } = useGetClubBalance(club?.clubId, address, club.chain);
  const { data: clubHoldings, isLoading: isLoadingClubHoldings } = useGetClubHoldings(club?.clubId, 0, club.chain); // get only the first page, to see which friends holding
  const { refetch: refetchClubPrice } = useGetBuyPrice(address, club?.clubId, "1", club.chain);

  // GHO/USDC Balance
  const { data: tokenBalance } = useReadContract({
    address: club.chain === "lens" ? WGHO_CONTRACT_ADDRESS : USDC_CONTRACT_ADDRESS,
    abi: erc20Abi,
    chainId: club.chain === "lens" ? (IS_PRODUCTION ? lens.id : lensTestnet.id) : CONTRACT_CHAIN_ID,
    functionName: "balanceOf",
    args: [address!],
    query: {
      refetchInterval: 5000,
    },
  });

  if (!club?.createdAt) return null;

  const clubHoldingsFriends = useMemo(() => {
    if (!isLoadingClubHoldings && !club.complete) {
      const res = clubHoldings?.holdings?.filter((data) => data.profile?.operations.isFollowedByMe.value) || [];
      setFriendCount(res.length);
      return sampleSize(res, 5).map(({ profile }) => profile);
    }
  }, [clubHoldings, isLoadingClubHoldings, club]);

  return (
    <div className="flex flex-col sm:min-w-[350px] max-w-screen">
      {" "}
      {/* Use flex container with full height */}
      <div className="flex-grow pb-2">
        {" "}
        {/* This div will grow to take available space, pushing the friends component to the bottom */}
        <BuySellWidget
          refetchClubBalance={refetchClubBalance}
          refetchClubPrice={refetchClubPrice}
          club={club}
          clubBalance={clubBalance}
          tokenBalance={tokenBalance}
          openTab={1}
          onBuyUSDC={onBuyUSDC}
          defaultBuyAmount={defaultBuyAmount}
        />
      </div>
    </div>
  );
};
