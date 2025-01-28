import { useMemo, useState } from "react";
import { erc20Abi } from "viem";
import { useReadContract } from "wagmi";
import { sampleSize } from "lodash/collection";
import { useGetClubBalance, useGetBuyPrice, useGetClubHoldings } from "@src/hooks/useMoneyClubs";
import { USDC_CONTRACT_ADDRESS, CONTRACT_CHAIN_ID } from "@src/services/madfi/moneyClubs";
import ProfilePics from "@src/components/ProfilePics/ProfilePics";
import { BuySellWidget } from "./BuySellWidget";

export const TradeComponent = ({ club, address, onBuyUSDC, defaultBuyAmount }) => {
  const [friendCount, setFriendCount] = useState(0);
  const { data: clubBalance, refetch: refetchClubBalance } = useGetClubBalance(club?.clubId, address);
  const { data: clubHoldings, isLoading: isLoadingClubHoldings } = useGetClubHoldings(club?.clubId, 0); // get only the first page, to see which friends holding
  const { refetch: refetchClubPrice } = useGetBuyPrice(address, club?.clubId, '1');
  const { data: tokenBalance } = useReadContract({
    address: USDC_CONTRACT_ADDRESS,
    abi: erc20Abi,
    chainId: CONTRACT_CHAIN_ID,
    functionName: 'balanceOf',
    args: [address],
    query: {
      refetchInterval: 5000
    }
  });

  if (!club?.createdAt) return null;

  const clubHoldingsFriends = useMemo(() => {
    if (!isLoadingClubHoldings && !club.complete) {
      const res = clubHoldings?.holdings?.filter((data) => data.profile?.operations.isFollowedByMe.value) || []
      setFriendCount(res.length);
      return sampleSize(res, 5).map(({ profile }) => profile);
    }
  }, [clubHoldings, isLoadingClubHoldings, club]);

  return (
    <div className="flex flex-col sm:min-w-[350px] max-w-screen"> {/* Use flex container with full height */}
      <div className="flex-grow pb-2"> {/* This div will grow to take available space, pushing the friends component to the bottom */}
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
  )
};