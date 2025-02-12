import { useMemo } from "react";
import { useAccount, useReadContract } from "wagmi";
import { formatUnits, erc20Abi } from "viem";
import { Button } from "@src/components/Button";
import { USDC_DECIMALS, CONTRACT_CHAIN_ID, USDC_CONTRACT_ADDRESS } from "@src/services/madfi/moneyClubs";
import { localizeNumber } from "@src/constants/utils";

export const Balance = () => {
  const { address, isConnected } = useAccount();
  const { data: tokenBalance } = useReadContract({
    address: USDC_CONTRACT_ADDRESS,
    abi: erc20Abi,
    chainId: CONTRACT_CHAIN_ID,
    functionName: 'balanceOf',
    args: [address!],
    query: {
      refetchInterval: 5000,
      enabled: isConnected
    }
  });

  const balanceFormatted = useMemo(() => {
    if (tokenBalance) {
      return localizeNumber(parseFloat(formatUnits(tokenBalance, USDC_DECIMALS)), undefined, 2);
    }

    return '0.00';
  }, [tokenBalance]);

  return (
    <div className="relative inline-block">
      <div
        className="bg-dark-grey text-white text-base font-medium rounded-xl md:px-2 py-2 min-h-fit h-10 text-[16px] leading-5 font-normal w-28"
      >
        <div className="flex flex-row justify-center items-center gap-x-2">
          <div className="relative items-center">
            <img
              src="/usdc.png"
              alt="usdc"
              className="w-[24px] h-[24px] object-cover rounded-lg"
            />
            <img
              src='/base.png'
              alt={'base'}
              className="absolute top-4 left-4 w-[12px] h-[12px]"
            />
          </div>
          <span>{balanceFormatted}</span>
        </div>
      </div>
    </div>
  );
};