import { useMemo, useState } from "react";
import { useAccount, useBalance, useReadContract, useSwitchChain, useWalletClient } from "wagmi";
import { formatUnits, erc20Abi } from "viem";
import clsx from "clsx";
import {
  USDC_DECIMALS,
  CONTRACT_CHAIN_ID,
  USDC_CONTRACT_ADDRESS,
  WGHO_CONTRACT_ADDRESS,
  WGHO_ABI,
  publicClient
} from "@src/services/madfi/moneyClubs";
import { localizeNumber } from "@src/constants/utils";
import { getChain, IS_PRODUCTION, lens, LENS_CHAIN_ID, lensTestnet, PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";
import { kFormatter } from "@src/utils/utils";
import { brandFont } from "@src/fonts/fonts";
import Popper from '@mui/material/Popper';
import { Button } from "@src/components/Button";
import useLensSignIn from "@src/hooks/useLensSignIn";
import queryFiatViaLIFI from "@src/utils/tokenPriceHelper";
import { Tooltip } from "@src/components/Tooltip";
import toast from "react-hot-toast";
import { waitForTransactionReceipt } from "viem/actions";
import { configureChainsConfig } from "@src/utils/wagmi";

export const Balance = ({ openMobileMenu }: { openMobileMenu?: boolean }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);
  const { address, isConnected, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { isAuthenticated, authenticatedProfile } = useLensSignIn(walletClient);
  const [isUnwrapping, setIsUnwrapping] = useState(false);
  const { switchChain } = useSwitchChain();

  // USDC Balance
  const { data: usdcBalance } = useReadContract({
    address: USDC_CONTRACT_ADDRESS,
    abi: erc20Abi,
    chainId: CONTRACT_CHAIN_ID,
    functionName: "balanceOf",
    args: [address!],
    query: {
      refetchInterval: 10000,
      enabled: isConnected,
    },
  });

  // GHO Balance
  const { data: ghoBalance } = useBalance({
    address,
    chainId: IS_PRODUCTION ? lens.id : lensTestnet.id,
  })

  // WGHO Balance
  const { data: wghoBalance } = useReadContract({
    address: WGHO_CONTRACT_ADDRESS,
    abi: erc20Abi,
    chainId: IS_PRODUCTION ? lens.id : lensTestnet.id,
    functionName: "balanceOf",
    args: [address!],
    query: {
      refetchInterval: 10000,
      enabled: isConnected,
    },
  });

  // WGHO Balance of Lens Account
  const { data: ghoBalanceLensAccount } = useReadContract({
    address: WGHO_CONTRACT_ADDRESS,
    abi: erc20Abi,
    chainId: IS_PRODUCTION ? lens.id : lensTestnet.id,
    functionName: "balanceOf",
    args: [authenticatedProfile?.address as `0x${string}`],
    query: {
      refetchInterval: 10000,
      enabled: false //isAuthenticated && authenticatedProfile?.address
    },
  });

  // BONSAI Balance
  const { data: bonsaiBalance } = useReadContract({
    address: PROTOCOL_DEPLOYMENT.lens.Bonsai as `0x${string}`,
    abi: erc20Abi,
    chainId: LENS_CHAIN_ID,
    functionName: "balanceOf",
    args: [address!],
    query: {
      refetchInterval: 10000,
      enabled: isAuthenticated && authenticatedProfile?.address
    },
  });

  // BONSAI Balance of Lens Account
  const { data: bonsaiBalanceLensAccount } = useReadContract({
    address: PROTOCOL_DEPLOYMENT.lens.Bonsai as `0x${string}`,
    abi: erc20Abi,
    chainId: LENS_CHAIN_ID,
    functionName: "balanceOf",
    args: [authenticatedProfile?.address as `0x${string}`],
    query: {
      refetchInterval: 10000,
      enabled: isAuthenticated && authenticatedProfile?.address
    },
  });

  const { usdcFormatted, ghoFormatted, wghoFormatted, bonsaiFormatted, totalFormatted, ghoLensFormatted, bonsaiLensFormatted } = useMemo(() => {
    const usdcAmount = usdcBalance ? parseFloat(formatUnits(usdcBalance, USDC_DECIMALS)) : 0;
    const wghoAmount = wghoBalance ? parseFloat(formatUnits(wghoBalance, 18)) : 0;
    const ghoAmount = ghoBalance ? parseFloat(formatUnits(ghoBalance.value, 18)) : 0;
    const ghoLensAmount = ghoBalanceLensAccount ? parseFloat(formatUnits(ghoBalanceLensAccount, 18)) : 0;
    const bonsaiAmount = bonsaiBalance ? parseFloat(formatUnits(bonsaiBalance, 18)) : 0;
    const bonsaiLensAmount = bonsaiBalanceLensAccount ? parseFloat(formatUnits(bonsaiBalanceLensAccount, 18)) : 0;

    return {
      usdcFormatted: localizeNumber(usdcAmount, undefined, 2),
      ghoFormatted: localizeNumber(ghoAmount, undefined, 2),
      wghoFormatted: localizeNumber(wghoAmount, undefined, 2),
      ghoLensFormatted: localizeNumber(ghoLensAmount, undefined, 2),
      bonsaiFormatted: kFormatter(bonsaiAmount, true),
      bonsaiLensFormatted: kFormatter(bonsaiLensAmount, true),
      totalFormatted: kFormatter(usdcAmount + wghoAmount + ghoAmount + ghoLensAmount), // TODO: need to get $ value for bonsai
    };
  }, [usdcBalance, wghoBalance, ghoBalanceLensAccount, bonsaiBalance, bonsaiBalanceLensAccount]);

  const handleMouseEnter = (event: React.MouseEvent<HTMLDivElement>) => {
    setAnchorEl(event.currentTarget);
    setShowDropdown(true);
  };

  const handleMouseLeave = () => {
    setShowDropdown(false);
    setAnchorEl(null);
  };

  const truncateAddress = (address: string) => {
    return `${address?.slice(0, 4)}...${address?.slice(-4)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleUnwrapGHO = async () => {
    if (!wghoBalance || wghoBalance === 0n) {
      toast.error("No WGHO to unwrap");
      return;
    }

    setIsUnwrapping(true);
    let toastId: string | undefined;
    try {
      const targetChainId = getChain("lens").id;
      if (chainId !== targetChainId) {
        try {
          console.log('switching to', targetChainId);
          switchChain({ chainId: targetChainId });
        } catch {
          toast.error("Please switch networks");
          setIsUnwrapping(false);
          return;
        }
      }

      toastId = toast.loading("Unwrapping GHO...");

      // Call the withdraw function on the WGHO contract
      const hash = await walletClient!.writeContract({
        address: WGHO_CONTRACT_ADDRESS,
        abi: WGHO_ABI,
        functionName: 'withdraw',
        args: [wghoBalance],
      });

      await publicClient("lens").waitForTransactionReceipt({ hash });

      toast.success("Successfully unwrapped GHO", { id: toastId, duration: 2000 });
    } catch (error) {
      console.error("Error unwrapping GHO:", error);
      toast.error("Failed to unwrap GHO", { id: toastId, duration: 2000 });
    } finally {
      setIsUnwrapping(false);
    }
  };

  // TODO: fetch bonsai token price from lens
  // useEffect(() => {
  //   const price = queryFiatViaLIFI(232, "0xB0588f9A9cADe7CD5f194a5fe77AcD6A58250f82");
  //   console.log(price);
  // }, []);

  return (
    <div className={clsx("relative inline-block", brandFont.className)}>
      <div
        className={`bg-dark-grey text-white text-base font-medium rounded-lg md:px-2 py-2 min-h-fit h-10 text-[16px] leading-5 ${!!openMobileMenu ? 'w-full' : 'w-40'} cursor-pointer relative`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex flex-row justify-center items-center gap-x-2">
          <div className="relative items-center ml-6">
            <img src="/bonsai.png" alt="bonsai" className="w-[24px] h-[24px] object-cover absolute right-8 z-20" />
            <img src="/gho.webp" alt="gho" className="w-[24px] h-[24px] object-cover absolute right-4 z-10" />
            <img src="/usdc.png" alt="usdc" className="w-[24px] h-[24px] object-cover relative" />
          </div>
          <span className="ml-2">${totalFormatted}</span>
        </div>

        <Popper
          open={showDropdown}
          anchorEl={anchorEl}
          placement="bottom-start"
          style={{ zIndex: 1400 }}
        >
          <div
            className={`mt-2 bg-dark-grey text-white p-4 rounded-lg shadow-lg ${!!openMobileMenu ? 'min-w-[420px]' : 'min-w-[320px]'} font-sf-pro-text`}
            onMouseEnter={() => setShowDropdown(true)}
            onMouseLeave={handleMouseLeave}
          >
            <div className="space-y-4">
              {/* Lens Account */}
              {isAuthenticated && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-4">
                        <Tooltip message="Lens Account address - used for collecting posts" direction="top" classNames="z-100">
                          <h3 className="font-medium text-white/80">Lens Account</h3>
                        </Tooltip>
                        <span className="text-xs font-mono text-zinc-500">{truncateAddress(authenticatedProfile?.address || '')}</span>
                        <div className="relative">
                          <button
                            className="h-5 w-5 hover:bg-zinc-700 p-1 rounded group"
                            onClick={() => {
                              copyToClipboard(address || '');
                              const tooltip = document.getElementById('copy-tooltip');
                              if (tooltip) {
                                tooltip.classList.remove('opacity-0');
                                setTimeout(() => {
                                  tooltip.classList.add('opacity-0');
                                }, 750);
                              }
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-3 w-3">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <div
                              id="copy-tooltip"
                              className="absolute left-full ml-2 px-2 py-1 bg-zinc-700 text-white text-xs rounded opacity-0 transition-opacity duration-200"
                              style={{top: '50%', transform: 'translateY(-50%)'}}
                            >
                              Copied
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="p-3 rounded-md flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src="/bonsai.png" alt="bonsai" className="w-5 h-5 rounded-full" />
                        <span className="text-sm text-zinc-400">BONSAI</span>
                      </div>
                      <p className="text-lg font-bold">{bonsaiLensFormatted}</p>
                    </div>
                    {/* <div className="bg-zinc-800 p-3 rounded-md flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src="/gho.webp" alt="gho" className="w-5 h-5 rounded-full" />
                        <span className="text-sm text-zinc-400">GHO</span>
                      </div>
                      <p className="text-lg font-bold">{ghoLensFormatted}</p>
                    </div> */}
                  </div>
                </div>
              )}

              <div className="my-4 h-[1px] bg-[rgba(255,255,255,0.05)]" />

              {/* Connected Wallet */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-4">

                      <Tooltip message="Connected wallet address - used for trading tokens" direction="top" classNames="z-100">
                        <h3 className="font-medium text-white/80">Connected Wallet</h3>
                      </Tooltip>
                      <span className="text-xs font-mono text-zinc-500">{truncateAddress(address || '')}</span>
                      <div className="relative">
                        <button
                          className="h-5 w-5 hover:bg-zinc-700 p-1 rounded group"
                          onClick={() => {
                            copyToClipboard(address || '');
                            const tooltip = document.getElementById('copy-tooltip-2');
                            if (tooltip) {
                              tooltip.classList.remove('opacity-0');
                              setTimeout(() => {
                                tooltip.classList.add('opacity-0');
                              }, 750);
                            }
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-3 w-3">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <div
                            id="copy-tooltip-2"
                            className="absolute left-full ml-2 px-2 py-1 bg-zinc-700 text-white text-xs rounded opacity-0 transition-opacity duration-200"
                            style={{top: '50%', transform: 'translateY(-50%)'}}
                          >
                            Copied
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="p-3 rounded-md flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src="/bonsai.png" alt="bonsai" className="w-5 h-5 rounded-full" />
                      <span className="text-sm text-zinc-400">BONSAI</span>
                    </div>
                    <p className="text-lg font-bold">{bonsaiFormatted}</p>
                  </div>
                  <div className="p-3 rounded-md relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src="/gho.webp" alt="gho" className="w-5 h-5 rounded-full" />
                        <span className="text-sm text-zinc-400">GHO</span>
                      </div>
                      <div className="relative group">
                        <p className={`text-lg font-bold ${ghoBalance?.value === 0n ? 'opacity-100 group-hover:opacity-0 transition-opacity' : ''}`}>{ghoFormatted}</p>
                        {ghoBalance?.value === 0n && (
                          <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a
                              target="_blank"
                              href="https://app.across.to/bridge?fromChain=8453&toChain=232&outputToken=0x0000000000000000000000000000000000000000"
                              className="text-md font-medium text-brand-highlight hover:opacity-80"
                            >
                              Bridge
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Thread line container */}
                    <div className="absolute left-0 top-[40px] w-12 h-[calc(100%-40px)] pointer-events-none">
                      {/* Curved corner */}
                      <div className="absolute left-5 top-0 w-4 h-5 border-b-2 border-l-2 border-zinc-700 rounded-bl-[10px]" />
                    </div>
                    <div className="mt-2 pl-7 flex flex-col group relative">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img src="/gho.webp" alt="gho" className="w-4 h-4 rounded-full opacity-70" />
                          <span className="text-zinc-500">Wrapped GHO</span>
                        </div>
                        <div className="relative">
                          <p className="text-sm font-medium text-zinc-400 group-hover:opacity-0 transition-opacity">{wghoFormatted}</p>
                          <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="accent"
                              size="xs"
                              onClick={handleUnwrapGHO}
                              disabled={isUnwrapping || wghoBalance === 0n}
                              className="text-xs -mt-3"
                            >
                              {isUnwrapping ? "Unwrapping..." : "Unwrap"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded-md flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src="/usdc.png" alt="usdc" className="w-5 h-5 rounded-full" />
                      <span className="text-sm text-zinc-400">USDC (Base)</span>
                    </div>
                    <p className="text-lg font-bold">{usdcFormatted}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Popper>
      </div>
    </div>
  );
};
