import { useMemo, useState } from "react";
import useIsMounted from "@src/hooks/useIsMounted";
import { useAccount, useBalance, useReadContract, useSwitchChain, useWalletClient } from "wagmi";
import { formatUnits, erc20Abi } from "viem";
import clsx from "clsx";
import {
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
import { Tooltip } from "@src/components/Tooltip";
import toast from "react-hot-toast";
import { useTopUpModal } from "@src/context/TopUpContext";
import Link from "next/link";
import Image from "next/image";
import useIsMobile from "@src/hooks/useIsMobile";
import { useIsMiniApp } from "@src/hooks/useIsMiniApp";
import { base } from "viem/chains";

export const Balance = ({ openMobileMenu }: { openMobileMenu?: boolean }) => {
  const isMounted = useIsMounted();
  const [showDropdown, setShowDropdown] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);
  const isMobile = useIsMobile();
  const { address, isConnected, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { isAuthenticated, authenticatedProfile } = useLensSignIn(walletClient);
  const [isUnwrapping, setIsUnwrapping] = useState(false);
  const { switchChain } = useSwitchChain();
  const { openTopUpModal } = useTopUpModal();
  const {isMiniApp} = useIsMiniApp();

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
    address: !isMiniApp ? PROTOCOL_DEPLOYMENT.lens.Bonsai as `0x${string}` : PROTOCOL_DEPLOYMENT.base.Bonsai as `0x${string}`,
    abi: erc20Abi,
    chainId: !isMiniApp ? LENS_CHAIN_ID : base.id,
    functionName: "balanceOf",
    args: [address!],
    query: {
      refetchInterval: 10000,
      enabled: !isMiniApp ? (isAuthenticated && authenticatedProfile?.address) : isConnected
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

  const { ghoFormatted, wghoFormatted, bonsaiFormatted, totalFormatted, ghoLensFormatted, bonsaiLensFormatted } = useMemo(() => {
    const wghoAmount = wghoBalance ? parseFloat(formatUnits(wghoBalance, 18)) : 0;
    const ghoAmount = ghoBalance ? parseFloat(formatUnits(ghoBalance.value, 18)) : 0;
    const ghoLensAmount = ghoBalanceLensAccount ? parseFloat(formatUnits(ghoBalanceLensAccount, 18)) : 0;
    const bonsaiAmount = bonsaiBalance ? parseFloat(formatUnits(bonsaiBalance, 18)) : 0;
    const bonsaiLensAmount = bonsaiBalanceLensAccount ? parseFloat(formatUnits(bonsaiBalanceLensAccount, 18)) : 0;

    return {
      ghoFormatted: localizeNumber(ghoAmount, undefined, 2),
      wghoFormatted: localizeNumber(wghoAmount, undefined, 2),
      ghoLensFormatted: localizeNumber(ghoLensAmount, undefined, 2),
      bonsaiFormatted: kFormatter(bonsaiAmount, undefined),
      bonsaiLensFormatted: kFormatter(bonsaiLensAmount, undefined),
      totalFormatted: kFormatter(wghoAmount + ghoAmount + ghoLensAmount), // TODO: need to get $ value for bonsai
    };
  }, [wghoBalance, ghoBalanceLensAccount, bonsaiBalance, bonsaiBalanceLensAccount]);

  const handleInteraction = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile) {
      setAnchorEl(event.currentTarget);
      setShowDropdown(!showDropdown);
    } else {
      setAnchorEl(event.currentTarget);
      setShowDropdown(true);
    }
  };

  const handleLeave = () => {
    if (!isMobile) {
      setShowDropdown(false);
      setAnchorEl(null);
    }
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

  // Prevent hydration mismatch by ensuring component doesn't render until mounted
  if (!isMounted) return null;

  if (!isConnected) return null;

  return (
    <div className={clsx("relative inline-block", brandFont.className)}>
      <div
        className={`bg-dark-grey text-white text-base font-medium rounded-lg md:px-2 py-2 min-h-fit h-10 text-[16px] leading-5 ${!!openMobileMenu ? 'w-full' : 'w-40'} cursor-pointer relative`}
        onClick={handleInteraction}
        onMouseEnter={!isMobile ? handleInteraction : undefined}
        onMouseLeave={!isMobile ? handleLeave : undefined}
      >
        <div className="flex flex-row justify-center items-center gap-x-2">
          <div className="relative items-center ml-6">
            <Image src="/bonsai.png" alt="bonsai" className="object-cover absolute right-8 z-20" width={24} height={24}/>
            <Image src="/gho.webp" alt="gho" className="object-cover absolute right-4 z-10" width={24} height={24}/>
            <Image src="/usdc.png" alt="usdc" className="object-cover relative opacity-0" width={24} height={24}/>
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
            className={`mt-2 bg-dark-grey text-white p-3 md:p-4 rounded-lg shadow-lg ${
              isMobile ? 'w-[calc(100vw-32px)]' : openMobileMenu ? 'min-w-[420px]' : 'min-w-[320px]'
            } font-sf-pro-text`}
            onMouseEnter={!isMobile ? () => setShowDropdown(true) : undefined}
            onMouseLeave={!isMobile ? handleLeave : undefined}
          >
            <div className="space-y-3 md:space-y-4">
              {/* Lens Account */}
              {isAuthenticated && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 md:gap-4">
                        <Tooltip message="Lens Account address - used for collecting posts" direction="top" classNames="z-100">
                          <h3 className="font-medium text-white/80 text-sm md:text-base">Lens Account</h3>
                        </Tooltip>
                        <span className="text-xs font-mono text-zinc-500">{truncateAddress(authenticatedProfile?.address || '')}</span>
                        <div className="relative">
                          <button
                            className="h-5 w-5 hover:bg-zinc-700 p-1 rounded group"
                            onClick={() => {
                              copyToClipboard(authenticatedProfile?.address || '');
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
                    <div className="p-2 md:p-3 rounded-md flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Image src="/bonsai.png" alt="bonsai" className="rounded-full" width={20} height={20}/>
                        <span className="text-sm text-zinc-400">IASNOB</span>
                      </div>
                      <p className="text-base md:text-lg font-bold">{bonsaiLensFormatted}</p>
                    </div>
                  </div>
                </div>
              )}

              {isAuthenticated && <div className="my-3 md:my-4 h-[1px] bg-[rgba(255,255,255,0.05)]" />}

              {/* Connected Wallet */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 md:gap-4">
                      <Tooltip message="Connected wallet address - used for trading tokens" direction="top" classNames="z-100">
                        <h3 className="font-medium text-white/80 text-sm md:text-base">Connected Wallet</h3>
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
                  <div className="p-2 md:p-3 rounded-md flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Image src="/bonsai.png" alt="bonsai" className="rounded-full" width={20} height={20}/>
                      <span className="text-sm text-zinc-400">IASNOB</span>
                    </div>
                    <p className="text-base md:text-lg font-bold">{bonsaiFormatted}</p>
                  </div>

                  {/* GHO only on non-miniapp */}
                  {!isMiniApp && (
                    <div className="p-2 md:p-3 rounded-md relative">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Image src="/gho.webp" alt="gho" className="rounded-full" width={20} height={20}/>
                          <span className="text-sm text-zinc-400">GHO</span>
                        </div>
                        <div className="relative group">
                          <p className={`text-base md:text-lg font-bold opacity-100 group-hover:opacity-0 transition-opacity`}>{ghoFormatted}</p>
                          <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Tooltip message="Bridge GHO to Lens Protocol" direction="bottom" classNames="z-100">
                              <a
                                target="_blank"
                                href="https://app.across.to/bridge?fromChain=8453&toChain=232&outputToken=0x0000000000000000000000000000000000000000"
                                className="text-sm md:text-md font-medium text-brand-highlight hover:opacity-80"
                              >
                                Bridge
                              </a>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                      {/* Thread line container */}
                      <div className="absolute left-0 top-[40px] w-12 h-[calc(100%-40px)] pointer-events-none">
                        {/* Curved corner */}
                        <div className="absolute left-5 top-0 w-4 h-5 border-b-2 border-l-2 border-zinc-700 rounded-bl-[10px]" />
                      </div>
                      <div className="mt-2 pl-7 flex flex-col relative">
                        <div className={`flex items-center justify-between ${wghoBalance && wghoBalance > 0n ? 'group' : ''}`}>
                          <div className="flex items-center gap-2">
                            <Image src="/gho.webp" alt="gho" className="rounded-full opacity-70" width={16} height={16}/>
                            <span className="text-zinc-500 text-sm">Wrapped GHO</span>
                          </div>
                          <div className="relative">
                            {wghoBalance && wghoBalance > 0n ? (
                              <>
                                <p className="font-medium text-zinc-400 text-sm md:text-base group-hover:opacity-0 transition-opacity">{wghoFormatted}</p>
                                <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Tooltip message="Convert WGHO back to GHO" direction="bottom" classNames="z-100">
                                    <p
                                      onClick={handleUnwrapGHO}
                                      className="text-sm md:text-md font-medium text-brand-highlight hover:opacity-80 cursor-pointer"
                                    >
                                      {isUnwrapping ? "Unwrapping..." : "Unwrap"}
                                    </p>
                                  </Tooltip>
                                </div>
                              </>
                            ) : (
                              <p className="font-medium text-zinc-400 text-sm md:text-base">{wghoFormatted}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-2 border-t border-zinc-800 flex flex-col w-full">
              <Tooltip message="Add funds to your wallet" direction="bottom" classNames="z-100">
                <Button
                  variant="blue"
                  size="md"
                  className="w-full flex items-center justify-center gap-2 text-sm md:text-base"
                  onClick={() => openTopUpModal()}
                >
                  Top Up Wallet
                </Button>
              </Tooltip>
              <Tooltip message="Bridge assets between networks" direction="bottom" classNames="z-100">
                <Link href="/stake?bridge=1" className="w-full">
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full flex items-center justify-center gap-2 mt-2 text-sm md:text-base"
                  >
                    Bridge
                  </Button>
                </Link>
              </Tooltip>
            </div>
          </div>
        </Popper>
      </div>
    </div>
  );
};
