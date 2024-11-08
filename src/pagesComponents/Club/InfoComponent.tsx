import { useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import { useReadContract } from "wagmi";
import toast from "react-hot-toast";
import {
  useGetBuyPrice,
  useGetFeesEarned,
  useGetClubVolume,
  useGetClubLiquidity,
} from "@src/hooks/useMoneyClubs";
import {
  calculatePriceDelta,
  DECIMALS,
  USDC_DECIMALS,
  CONTRACT_CHAIN_ID,
} from "@src/services/madfi/moneyClubs";
import { roundedToFixed } from "@src/utils/utils";
import { LAUNCHPAD_CONTRACT_ADDRESS } from "@src/services/madfi/utils";
import BonsaiLaunchpadAbi from "@src/services/madfi/abi/BonsaiLaunchpad.json";
import { Button } from "@src/components/Button";
import ProgressBar from "@src/components/ProgressBar";

export const InfoComponent = ({
  club,
  address,
  profile,
  isCreatorAdmin,
}) => {
  const { data: buyPriceResult } = useGetBuyPrice(address, club?.clubId, '1');
  const { data: creatorFeesEarned } = useGetFeesEarned(isCreatorAdmin, address);
  const { data: clubVolume, isLoading: isLoadingVolume } = useGetClubVolume(club?.clubId);
  const { data: clubLiquidity } = useGetClubLiquidity(club?.clubId);
  const { data: minLiquidityThreshold } = useReadContract({
    address: LAUNCHPAD_CONTRACT_ADDRESS,
    abi: BonsaiLaunchpadAbi,
    chainId: CONTRACT_CHAIN_ID,
    functionName: 'minLiquidityThreshold'
  });
  const [volume, setVolume] = useState<bigint>();

  const buyPriceFormatted = useMemo(() => {
    if (buyPriceResult?.buyPrice) {
      return roundedToFixed(parseFloat(formatUnits(BigInt(buyPriceResult.buyPrice.toString()), DECIMALS)), 2);
    }
  }, [buyPriceResult]);

  const buyPriceDelta = useMemo(() => {
    if (buyPriceResult?.buyPrice && !!club.prevTrade) {
      return calculatePriceDelta(buyPriceResult?.buyPrice, BigInt(club.prevTrade.prevPrice || 0n));
    }
  }, [buyPriceResult]);

  const creatorFeesFormatted = useMemo(() => {
    if (creatorFeesEarned) {
      return roundedToFixed(parseFloat(formatUnits(BigInt(creatorFeesEarned.toString()), 18)));
    }

    return '0';
  }, [creatorFeesEarned]);

  const bondingCurveProgress = useMemo(() => {
    if (minLiquidityThreshold && clubLiquidity) {
      const scaledMinLiquidityThreshold = (minLiquidityThreshold as bigint) * BigInt(10 ** USDC_DECIMALS);
      const fraction = (clubLiquidity * BigInt(100)) / scaledMinLiquidityThreshold;
      return parseInt(fraction.toString());
    }
  }, [minLiquidityThreshold, club, clubLiquidity]);

  // const withdrawFeesEarned = async () => {
  //   setClaiming(true);
  //   let toastId;

  //   // TODO: not needed if using biconomy
  //   if (chain!.id !== blastChainId && switchChain) {
  //     try {
  //       await switchChain(blastChainId);
  //     } catch {
  //       toast.error("Please switch networks");
  //     }
  //     setClaiming(false);
  //     return;
  //   }

  //   try {
  //     toastId = toast.loading("Claiming fees & yield share...");
  //     await withdrawFeesEarnedWithPaymaster(walletClient, creatorFeesEarned!);
  //     refetchCreatorFeesEarned();

  //     toast.success(`Claimed`, { duration: 5000, id: toastId });
  //   } catch (error) {
  //     console.log(error);
  //     toast.error("Failed to claim", { id: toastId });
  //   }
  //   setClaiming(false);
  // };

  const handleCopy = () => {
    const frameURL = `https://frames.bonsai.meme/cashtags/club?moneyClubAddress=${club!.id}&moneyClubProfileId=${profile.id}`;
    navigator.clipboard.writeText(frameURL);
    toast("Frame URL copied - go share it!", { position: "bottom-center", icon: "🔗", duration: 3000 });
  };

  useEffect(() => {
    if (!isLoadingVolume) {
      setVolume(clubVolume!);
    }
  }, [isLoadingVolume, clubVolume]);

  if (!club?.createdAt) return null;

  return (
    <>
      <div className="flex flex-col space-y-4">
        <div className="space-y-2">
          <h2 className="text-lg font-owners tracking-wide leading-6">Price</h2>
          <div className="flex flex-col items-start gap-y-2">
            <div className="flex justify-between items-center md:gap-x-2">
              <div className="md:text-lg text-md">
                ${buyPriceFormatted ? `${buyPriceFormatted}` : '-'}
              </div>
              {buyPriceDelta && buyPriceDelta.valuePct > 0 && (
                <div className={`flex ${buyPriceDelta.positive ? 'text-green-500' : 'text-red-200'}`}>
                  {buyPriceDelta.positive ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className="text-sm">{buyPriceDelta.valuePct}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-owners tracking-wide leading-6">Market Cap</h2>
          <div className="flex flex-col items-start gap-x-2">
            <div className="md:text-lg text-md">
              ${clubLiquidity === undefined ? '-' : roundedToFixed(parseFloat(formatUnits(clubLiquidity, USDC_DECIMALS)), 2)}
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-owners tracking-wide leading-6">Volume (24hr)</h2>
          <div className="flex justify-between items-center gap-x-2">
            <div className="md:text-lg text-md">
              ${volume === undefined ? ' -' : roundedToFixed(parseFloat(formatUnits(volume || 0n, USDC_DECIMALS)), 2)}
            </div>
          </div>
        </div>
        <div className="space-y-2 mt-8">
          <h2 className="text-lg font-owners tracking-wide leading-6">Bonding Curve{" "}{club.complete ? "Complete" : "Progress"}</h2>
          <ProgressBar progress={bondingCurveProgress || 0} />
        </div>
      </div>
      {/* {club?.createdAt && (
        <div className="flex justify-end items-center text-sm gap-x-2">
          <span className={`copy-btn w-7 p-1 cursor-pointer`} onClick={handleCopy}>
            <LinkIcon className="h-5 w-5 text-white" />
          </span>
          <p className="link link-hover -ml-1" onClick={handleCopy}>
            Frame URL
          </p>
        </div>
      )} */}
      {/* {!!club?.createdAt && (isCreatorAdmin || hasSomeBalance) && (
            <Disclosure as="div">
              {({ open }) => (
                <>
                  <Disclosure.Button className="flex w-full items-center justify-between">
                    <h2 className="text-lg font-owners tracking-wide leading-6">Earnings</h2>
                    <span className="ml-6 flex items-center">
                      {open ? (
                        <ChevronUpIcon className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />
                      )}
                    </span>
                  </Disclosure.Button>
                  <Transition
                    enter="transition ease-in-out duration-200"
                    enterFrom="opacity-0 translate-y-1"
                    enterTo="opacity-100 translate-y-0"
                  >
                    <Disclosure.Panel className="p-2">
                      <div className="flex flex-col items-center justify-center mb-4 mt-8">
                        {isCreatorAdmin && (
                          <>
                            <p className="text-md text-secondary font-light text-center">
                              You have earned <span className="font-bold">{creatorFeesFormatted} ETH</span> in trading fees.
                            </p>
                            <Button
                              className="mt-6"
                              variant="primary"
                              onClick={withdrawFeesEarned}
                              disabled={claiming || parseFloat(creatorFeesFormatted) === 0}
                            >
                              Claim
                            </Button>
                          </>
                        )}
                      </div>
                    </Disclosure.Panel>
                  </Transition>
                </>
              )}
            </Disclosure>
          )} */}
    </>
  )
};