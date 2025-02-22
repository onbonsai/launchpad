import { useMemo, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { formatUnits, erc20Abi } from "viem";
import { Button } from "@src/components/Button";
import {
  USDC_DECIMALS,
  CONTRACT_CHAIN_ID,
  USDC_CONTRACT_ADDRESS,
  WGHO_CONTRACT_ADDRESS,
  DECIMALS,
} from "@src/services/madfi/moneyClubs";
import { localizeNumber } from "@src/constants/utils";
import { IS_PRODUCTION, lens, lensTestnet } from "@src/services/madfi/utils";
import { kFormatter } from "@src/utils/utils";
export const Balance = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const { address, isConnected } = useAccount();

  // USDC Balance
  const { data: usdcBalance } = useReadContract({
    address: USDC_CONTRACT_ADDRESS,
    abi: erc20Abi,
    chainId: CONTRACT_CHAIN_ID,
    functionName: "balanceOf",
    args: [address!],
    query: {
      refetchInterval: 5000,
      enabled: isConnected,
    },
  });

  // GHO Balance
  const { data: ghoBalance } = useReadContract({
    address: WGHO_CONTRACT_ADDRESS,
    abi: erc20Abi,
    chainId: IS_PRODUCTION ? lens.id : lensTestnet.id,
    functionName: "balanceOf",
    args: [address!],
    query: {
      refetchInterval: 5000,
      enabled: isConnected,
    },
  });

  const { usdcFormatted, ghoFormatted, totalFormatted } = useMemo(() => {
    const usdcAmount = usdcBalance ? parseFloat(formatUnits(usdcBalance, USDC_DECIMALS)) : 0;
    const ghoAmount = ghoBalance ? parseFloat(formatUnits(ghoBalance, DECIMALS)) : 0;

    return {
      usdcFormatted: localizeNumber(usdcAmount, undefined, 2),
      ghoFormatted: localizeNumber(ghoAmount, undefined, 2),
      totalFormatted: kFormatter(usdcAmount + ghoAmount),
    };
  }, [usdcBalance, ghoBalance]);

  return (
    <div className="relative inline-block">
      <div
        className="bg-dark-grey text-white text-base font-medium rounded-xl md:px-2 py-2 min-h-fit h-10 text-[16px] leading-5 w-28 cursor-pointer relative"
        onMouseEnter={() => setShowDropdown(true)}
        onMouseLeave={() => setShowDropdown(false)}
      >
        <div className="flex flex-row justify-center items-center gap-x-2">
          <div className="relative items-center">
            <img src="/usdc.png" alt="usdc" className="w-[24px] h-[24px] object-cover rounded-lg absolute right-3" />
            <img src="/gho.webp" alt="gho" className="w-[24px] h-[24px] object-cover rounded-lg relative z-10" />
          </div>
          <span>${totalFormatted}</span>
        </div>

        {showDropdown && (
          <div
            className="fixed mt-3 right-[92px] bg-dark-grey text-white p-4 rounded-xl shadow-lg w-[300px] z-[140]"
            style={{
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
              transform: "translateY(0)",
            }}
          >
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-x-2">
                <div className="relative">
                  <img src="/gho.webp" alt="gho" className="w-[20px] h-[20px] object-cover rounded-lg" />
                  <img src="/lens.png" alt={"lens"} className="absolute top-3 left-3 h-[9px]" />
                </div>
                <span className="text-sm text-white">WGHO on Lens</span>
              </div>
              <span className="text-sm text-white">{ghoFormatted}</span>
            </div>
            <div className="flex items-center justify-between mb-2 py-1">
              <div className="flex items-center gap-x-2">
                <div className="relative">
                  <img src="/usdc.png" alt="usdc" className="w-[20px] h-[20px] object-cover rounded-lg" />
                  <img src="/base.png" alt={"base"} className="absolute top-3 left-3 w-[10px] h-[10px]" />
                </div>
                <span className="text-sm text-white">USDC on Base</span>
              </div>
              <span className="text-sm text-white">{usdcFormatted}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
