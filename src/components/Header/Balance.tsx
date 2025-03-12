import { useMemo, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { formatUnits, erc20Abi } from "viem";
import clsx from "clsx";
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
import { inter } from "@src/fonts/fonts";
import Popper from '@mui/material/Popper';
import { useAuthenticatedLensProfile } from "@src/hooks/useLensProfile";
import { Subtitle } from "@src/styles/text";
import WalletButton from "../Creators/WalletButton";

export const Balance = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);
  const { address, isConnected } = useAccount();
  const { data: authenticatedProfile } = useAuthenticatedLensProfile();

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

  const handleMouseEnter = (event: React.MouseEvent<HTMLDivElement>) => {
    setAnchorEl(event.currentTarget);
    setShowDropdown(true);
  };

  const handleMouseLeave = () => {
    setShowDropdown(false);
    setAnchorEl(null);
  };

  const formattedAccount = useMemo(() => {
    return `${authenticatedProfile?.address.slice(0, 6)}...`;
  }, [authenticatedProfile]);

  return (
    <div className={clsx("relative inline-block", inter.className)}>
      <div
        className="bg-dark-grey text-white text-base font-medium rounded-xl md:px-2 py-2 min-h-fit h-10 text-[16px] leading-5 w-32 cursor-pointer relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex flex-row justify-center items-center gap-x-2">
          <div className="relative items-center ml-2">
            <img src="/usdc.png" alt="usdc" className="w-[24px] h-[24px] object-cover rounded-lg absolute right-3" />
            <img src="/gho.webp" alt="gho" className="w-[24px] h-[24px] object-cover rounded-lg relative z-10" />
          </div>
          <span>${totalFormatted}</span>
        </div>

        <Popper
          open={showDropdown}
          anchorEl={anchorEl}
          placement="bottom-start"
          style={{ zIndex: 1400 }}
        >
          <div
            className="mt-2 bg-dark-grey text-white p-4 rounded-xl shadow-lg w-[300px] space-y-2"
            onMouseEnter={() => setShowDropdown(true)}
            onMouseLeave={handleMouseLeave}
          >
            {/* <div className="flex items-center space-x-2">
              <Subtitle className="text-white/70">Lens Account</Subtitle>
              <WalletButton wallet={authenticatedProfile?.address} />
            </div> */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-x-2">
                <div className="relative">
                  <img src="/gho.webp" alt="gho" className="w-[24px] h-[24px] object-cover rounded-lg" />
                </div>
                <span className="text-sm text-white">WGHO on Lens</span>
              </div>
              <span className="text-sm text-white">{ghoFormatted}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-x-2">
                <div className="relative">
                  <img src="/usdc.png" alt="usdc" className="w-[24px] h-[24px] object-cover rounded-lg" />
                </div>
                <span className="text-sm text-white">USDC on Base</span>
              </div>
              <span className="text-sm text-white">{usdcFormatted}</span>
            </div>
          </div>
        </Popper>
      </div>
    </div>
  );
};
