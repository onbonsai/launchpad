import { useMemo, useState } from "react";
import { erc20Abi } from "viem";
import { useReadContract } from "wagmi";
import { sampleSize } from "lodash/collection";
import { useGetClubBalance, useGetBuyPrice, useGetClubHoldings } from "@src/hooks/useMoneyClubs";
import { USDC_CONTRACT_ADDRESS, CONTRACT_CHAIN_ID, WGHO_CONTRACT_ADDRESS } from "@src/services/madfi/moneyClubs";
import { BuySellWidget } from "./BuySellWidget";
import { lens, lensTestnet, PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";
import { IS_PRODUCTION } from "@src/services/madfi/utils";

interface TradeComponentProps {
  club: any;
  address: `0x${string}` | undefined;
  onBuyUSDC?: () => void;
  defaultBuyAmount?: string;
  mediaProtocolFeeRecipient?: string;
  useRemixReferral?: `0x${string}`;
  closeModal?: () => void;
  postId?: string;
  inputToken?: string;
}

const TradeComponent = ({ club, address, onBuyUSDC, defaultBuyAmount, mediaProtocolFeeRecipient, useRemixReferral, closeModal, postId, inputToken }: TradeComponentProps) => {
  const [friendCount, setFriendCount] = useState(0);
  const { data: clubBalance, refetch: refetchClubBalance } = useGetClubBalance(club?.clubId, address, club.chain, club.complete, club.tokenAddress);
  const { data: clubHoldings, isLoading: isLoadingClubHoldings } = useGetClubHoldings(club?.clubId, 0, club.chain); // get only the first page, to see which friends holding
  const { refetch: refetchClubPrice } = useGetBuyPrice(address, club?.clubId, "1", club.chain);

  if (!club?.createdAt) return null;

  // const clubHoldingsFriends = useMemo(() => {
  //   if (!isLoadingClubHoldings && !club.complete) {
  //     const res = clubHoldings?.holdings?.filter((data) => data.profile?.operations.isFollowedByMe.value) || [];
  //     setFriendCount(res.length);
  //     return sampleSize(res, 5).map(({ profile }) => profile);
  //   }
  // }, [clubHoldings, isLoadingClubHoldings, club]);

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
          openTab={1}
          onBuyUSDC={onBuyUSDC}
          defaultBuyAmount={defaultBuyAmount}
          mediaProtocolFeeRecipient={mediaProtocolFeeRecipient}
          useRemixReferral={useRemixReferral}
          closeModal={closeModal}
          postId={postId}
        />
      </div>
    </div>
  );
};

export default TradeComponent;