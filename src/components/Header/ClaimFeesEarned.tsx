import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { Button } from "@src/components/Button";
import { USDC_DECIMALS } from "@src/services/madfi/moneyClubs";
import { useGetFeesEarned } from "@src/hooks/useMoneyClubs";
import { roundedToFixed } from "@src/utils/utils";
import { Subtitle, SmallSubtitle } from '@src/styles/text';

export const ClaimFeesEarned = () => {
  const { address } = useAccount();
  const { data: creatorFeesEarned, isLoading } = useGetFeesEarned(address);
  const [showTooltip, setShowTooltip] = useState(false);


  const creatorFeesFormatted = useMemo(() => {
    if (creatorFeesEarned) {
      return roundedToFixed(parseFloat(formatUnits(BigInt(creatorFeesEarned.toString()), USDC_DECIMALS)), 2);
    }

    return '0.00';
  }, [creatorFeesEarned]);

  const claimFeesEarned = async () => {

  }

  return (
    <div className="relative inline-block">
      <Button
        variant="dark-grey"
        size="md"
        className="text-base font-medium md:px-4 rounded-xl"
        disabled={isLoading || creatorFeesEarned === 0n}
        onClick={() => setShowTooltip(!showTooltip)}
      >
        Earnings ${creatorFeesFormatted}
      </Button>
      {showTooltip && <EarningsTooltip creatorFeesFormatted={creatorFeesFormatted} />}
    </div>
  );
};

const EarningsTooltip = ({ creatorFeesFormatted }) => {
  return (
    <div className="absolute mt-2 right-0 bg-dark-grey text-white p-4 rounded-xl shadow-lg w-[300px]">
      <Subtitle>
        Total earnings: ${creatorFeesFormatted}
      </Subtitle>
      <SmallSubtitle>
        Creator, referral, protocol fees
      </SmallSubtitle>
    </div>
  );
};
