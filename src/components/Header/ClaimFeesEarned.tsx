import { useMemo } from "react";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { Button } from "@src/components/Button";
import { USDC_DECIMALS } from "@src/services/madfi/moneyClubs";
import { useGetFeesEarned } from "@src/hooks/useMoneyClubs";
import { roundedToFixed } from "@src/utils/utils";

export const ClaimFeesEarned = () => {
  const { address } = useAccount();
  const { data: creatorFeesEarned, isLoading } = useGetFeesEarned(address);

  const creatorFeesFormatted = useMemo(() => {
    if (creatorFeesEarned) {
      return roundedToFixed(parseFloat(formatUnits(BigInt(creatorFeesEarned.toString()), USDC_DECIMALS)), 2);
    }

    return '0.00';
  }, [creatorFeesEarned]);

  const claimFeesEarned = async () => {

  }

  return (
    <Button
      variant="dark-grey"
      size="md" // This sets the height to 40px and padding appropriately
      className="text-base font-medium md:px-4 rounded-xl"
      disabled={isLoading || creatorFeesEarned === 0n}
      onClick={claimFeesEarned}
    >
      Earnings ${creatorFeesFormatted}
    </Button>
  )
};