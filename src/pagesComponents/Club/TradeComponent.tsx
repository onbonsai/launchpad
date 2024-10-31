import { erc20Abi } from "viem";
import { useReadContract } from "wagmi";

import { useGetClubBalance, useGetBuyPrice } from "@src/hooks/useMoneyClubs";
import { USDC_CONTRACT_ADDRESS, CONTRACT_CHAIN_ID } from "@src/services/madfi/moneyClubs";

import { BuySellWidget } from "./BuySellWidget";

export const TradeComponent = ({ club, address }) => {
  const { data: clubBalance, refetch: refetchClubBalance } = useGetClubBalance(club?.clubId, address);
  const { refetch: refetchClubPrice } = useGetBuyPrice(address, club?.clubId, '1');
  const { data: tokenBalance } = useReadContract({
    address: USDC_CONTRACT_ADDRESS,
    abi: erc20Abi,
    chainId: CONTRACT_CHAIN_ID,
    functionName: 'balanceOf',
    args: [address]
  });

  if (!club?.createdAt) return null;

  return (
    <BuySellWidget
      refetchRegisteredClub={() => { }}
      refetchClubBalance={refetchClubBalance}
      refetchClubPrice={refetchClubPrice}
      club={club}
      clubBalance={clubBalance}
      tokenBalance={tokenBalance}
      openTab={1}
    />
  )
};