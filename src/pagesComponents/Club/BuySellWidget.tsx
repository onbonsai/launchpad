import { brandFont } from "@src/fonts/fonts";
import { useMemo, useState } from "react";
import { useAccount, useWalletClient, useSwitchChain, useBalance, useReadContract } from "wagmi";
import { encodeAbiParameters, erc20Abi, formatUnits, parseEther, parseUnits, zeroAddress } from "viem";
import toast from "react-hot-toast";
import ConfettiExplosion from 'react-confetti-explosion';
import clsx from "clsx";

import { Button } from "@src/components/Button"
import { castIntentTokenReferral, kFormatter, roundedToFixed, tweetIntentTokenReferral } from "@src/utils/utils";
import {
  useGetSellPrice,
  useGetBuyAmount,
  useGetTradingInfo,
} from "@src/hooks/useMoneyClubs";
import {
  DECIMALS,
  CONTRACT_CHAIN_ID,
  USDC_CONTRACT_ADDRESS,
  USDC_DECIMALS,
  buyChips as buyChipsTransaction,
  sellChips as sellChipsTransaction,
  approveToken,
  MAX_MINTABLE_SUPPLY,
  WGHO_CONTRACT_ADDRESS,
  WGHO_ABI,
  publicClient,
  SWAP_TO_BONSAI_POST_ID,
} from "@src/services/madfi/moneyClubs";
import { SITE_URL } from "@src/constants/constants";
import CurrencyInput from "./CurrencyInput";
import { ArrowDownIcon, ExternalLinkIcon } from "@heroicons/react/outline";
import { Header as HeaderText, Header2 as Header2Text } from "@src/styles/text";
import { useRouter } from "next/router";
import { localizeNumber } from "@src/constants/utils";
import { ACTION_HUB_ADDRESS, getChain, IS_PRODUCTION, lens, LENS_BONSAI_DEFAULT_FEED, LENS_GLOBAL_FEED, lensTestnet, PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";
import ActionHubAbi from "@src/services/madfi/abi/ActionHub.json";
import { calculatePath, PARAM__CLIENT_ADDRESS, PARAM__REFERRALS } from "@src/services/lens/rewardSwap";
import { PARAM__AMOUNT_OUT_MINIMUM } from "@src/services/lens/rewardSwap";
import { PARAM__AMOUNT_IN } from "@src/services/lens/rewardSwap";
import { PARAM__PATH } from "@src/services/lens/rewardSwap";
import useQuoter from "@src/services/uniswap/useQuote";

export const BuySellWidget = ({
  refetchClubBalance,
  refetchClubPrice,
  club,
  clubBalance,
  openTab: _openTab,
  onBuyUSDC,
  defaultBuyAmount,
  mediaProtocolFeeRecipient,
  useRemixReferral,
  closeModal,
  postId,
}) => {
  const router = useRouter();
  const referralAddress = !!useRemixReferral ? useRemixReferral : router.query.ref as `0x${string}`;
  const { chainId, address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();
  const [openTab, setOpenTab] = useState<number>(_openTab);
  const [buyPrice, setBuyPrice] = useState<string>(defaultBuyAmount ?? '');
  const [sellAmount, setSellAmount] = useState<string>('');
  const [isBuying, setIsBuying] = useState(false);
  const [isSelling, setIsSelling] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [useBonsaiAsInput, setUseBonsaiAsInput] = useState(false);

  const _DECIMALS = club.chain === "lens" ? DECIMALS : USDC_DECIMALS;

  // GHO Balance
  const { data: ghoBalance } = useBalance({
    address,
    chainId: IS_PRODUCTION ? lens.id : lensTestnet.id,
    query: {
      enabled: club.chain === "lens",
      refetchInterval: 10000,
    }
  })

    // GHO/USDC Balance
    const { data: tokenBalance } = useReadContract({
      address: club.chain === "lens" ? (club.complete && (openTab === 2 || useBonsaiAsInput) ? PROTOCOL_DEPLOYMENT.lens.Bonsai : WGHO_CONTRACT_ADDRESS) : USDC_CONTRACT_ADDRESS,
      abi: erc20Abi,
      chainId: club.chain === "lens" ? (IS_PRODUCTION ? lens.id : lensTestnet.id) : CONTRACT_CHAIN_ID,
      functionName: "balanceOf",
      args: [address!],
      query: {
        refetchInterval: 5000,
      },
    });

  // const { data: buyPriceResult, isLoading: isLoadingBuyPrice } = useGetBuyPrice(address, club?.clubId, buyAmount);
  const { data: buyAmountResult, isLoading: isLoadingBuyAmount } = useGetBuyAmount(address, club?.tokenAddress, buyPrice, club.chain, club.initialPrice ? {
    initialPrice: club.initialPrice,
    targetPriceMultiplier: club.targetPriceMultiplier,
    flatThreshold: club.flatThreshold,
    completed: club.complete
  } : undefined);
  const { buyAmount, effectiveSpend } = buyAmountResult || {};
  const { data: sellPriceResult, isLoading: isLoadingSellPrice } = useGetSellPrice(address, club?.clubId, sellAmount, club.chain);
  const { refresh: refreshTradingInfo } = useGetTradingInfo(club.clubId, club.chain);
  const { sellPrice, sellPriceAfterFees } = sellPriceResult || {};
  const [justBought, setJustBought] = useState(false);
  const [justBoughtAmount, setJustBoughtAmount] = useState<string>();
  const notEnoughFunds = useMemo(() => {
    const requiredAmount = parseUnits(buyPrice || '0', _DECIMALS);
    const currentWGHOBalance = tokenBalance || 0n;

    if (club.chain === "lens") {
      // For Lens chain, consider both GHO and WGHO balances
      const ghoBalanceInWei = ghoBalance?.value || 0n;
      const totalAvailableBalance = currentWGHOBalance + ghoBalanceInWei;
      return requiredAmount > totalAvailableBalance;
    }

    // For other chains, just check USDC balance as before
    return requiredAmount > currentWGHOBalance;
  }, [buyPrice, tokenBalance, ghoBalance?.value, club.chain, _DECIMALS]);

  const sellPriceFormatted = useMemo(() => (
    roundedToFixed(parseFloat(formatUnits(sellPriceAfterFees || 0n, _DECIMALS)), 4)
  ), [sellPrice, isLoadingSellPrice]);

  const sellAmountError: boolean = useMemo(() => {
    if (!sellAmount) return false;
    if (!clubBalance || clubBalance.toString() === "0") return true;

    // TOOD: handle not enough liquidity or selling the last chip edge cases
    // if (club?.supply && parseUnits(sellAmount.toString(), DECIMALS) >= BigInt(club.supply)) {
    //   toast.error('Cannot sell the last $cashtag; choose a smaller amount');
    //   return true;
    // }
    return !!sellAmount && parseUnits(sellAmount, DECIMALS) > clubBalance!;
  }, [club, sellAmount, clubBalance]);

  const buyChips = async (e) => {
    e.preventDefault();
    setIsBuying(true);
    let toastId;

    const targetChainId = getChain(club.chain).id;
    if (chainId !== targetChainId) {
      try {
        console.log('switching to', targetChainId);
        switchChain({ chainId: targetChainId });
      } catch {
        toast.error("Please switch networks");
        setIsBuying(false);
        return;
      }
    }

    try {
      const buyPriceBigInt = parseUnits(buyPrice, _DECIMALS)
      const maxPrice = buyPriceBigInt * BigInt(105) / BigInt(100) // 5% slippage allowed
      const quoteTokenAddress = club.chain === "lens" ? WGHO_CONTRACT_ADDRESS : USDC_CONTRACT_ADDRESS;
      // console.log(quoteTokenAddress, maxPrice, walletClient, toastId, undefined, club.chain)

      if (club.chain === "lens") {
        // Calculate how much WGHO we need for the transaction
        const requiredAmount = parseUnits(buyPrice, _DECIMALS);
        const currentWGHOBalance = tokenBalance || 0n;

        // If we don't have enough WGHO
        if (currentWGHOBalance < requiredAmount) {
          // Calculate how much more WGHO we need
          const additionalWGHONeeded = requiredAmount - currentWGHOBalance;

          // Check if user has enough GHO to wrap
          const ghoBalanceInWei = ghoBalance?.value || 0n;
          if (ghoBalanceInWei < additionalWGHONeeded) {
            toast.error("Insufficient GHO balance");
            setIsBuying(false);
            return;
          }

          // Wrap the required amount
          console.log("Wrapping GHO:", formatUnits(additionalWGHONeeded, _DECIMALS));
          toastId = toast.loading("Wrapping GHO...");
          // Call the deposit function on the WGHO contract
          const hash = await walletClient!.writeContract({
            address: WGHO_CONTRACT_ADDRESS,
            abi: WGHO_ABI,
            functionName: 'deposit',
            args: [],
            value: additionalWGHONeeded,
          });

          await publicClient("lens").waitForTransactionReceipt({ hash });
          toast.success("Wrapped GHO", { id: toastId });
        }
      }

      await approveToken(quoteTokenAddress, maxPrice, walletClient, toastId, undefined, club.chain);

      toastId = toast.loading("Buying", { id: toastId });
      await buyChipsTransaction(walletClient, club.clubId, buyAmount!, maxPrice, referralAddress, club.chain, mediaProtocolFeeRecipient);

      // give the indexer some time
      setTimeout(refetchClubBalance, 5000);
      setTimeout(refreshTradingInfo, 5000);
      // setTimeout(refetchClubPrice, 5000); // don't refetch price

      toast.success(`Bought ${kFormatter(parseFloat(formatUnits(buyAmount!, DECIMALS)))} $${club.token.symbol}`, { duration: 10000, id: toastId });

      if (!!useRemixReferral) {
        closeModal();
        return;
      }

      setJustBought(true);
      setShowConfetti(true);
      setJustBoughtAmount(formatUnits(buyAmount!, DECIMALS));
      // Remove confetti after 5 seconds
      setTimeout(() => setShowConfetti(false), 5000);
    } catch (error) {
      console.log(error);
      toast.error("Failed to buy", { id: toastId });
    }
    setIsBuying(false);
  }

  const sellChips = async (e) => {
    e.preventDefault();
    setIsSelling(true);
    let toastId;

    const targetChainId = getChain(club.chain).id;
    if (chainId !== targetChainId) {
      try {
        await switchChain({ chainId: CONTRACT_CHAIN_ID });
      } catch {
        toast.error("Please switch networks");
      }
      setIsBuying(false);
      return;
    }

    try {
      toastId = toast.loading("Selling...");
      const minAmountOut = (sellPriceAfterFees || 0n) * BigInt(95) / BigInt(100) // 5% slippage allowed
      await sellChipsTransaction(walletClient, club.clubId, sellAmount!, minAmountOut, club.chain);

      setTimeout(refetchClubBalance, 5000);
      setTimeout(refreshTradingInfo, 5000);
      // setTimeout(refetchClubPrice, 5000); // don't refetch price

      toast.success(`Sold ${sellAmount} $${club.token.symbol}`, { duration: 10000, id: toastId });
    } catch (error) {
      console.log(error);
      toast.error("Failed to sell", { id: toastId });
    }
    setIsSelling(false);
  }

  const { data: quoteResult, isLoading: isLoadingQuote } = useQuoter({
    account: address as `0x${string}`,
    path:
      club.chain === "lens" && club.complete && openTab === 2
        ? calculatePath(PROTOCOL_DEPLOYMENT.lens.Bonsai, club.tokenAddress)
        : calculatePath(club.tokenAddress, useBonsaiAsInput ? PROTOCOL_DEPLOYMENT.lens.Bonsai : undefined),
    amountIn: parseUnits(openTab === 1 ? buyPrice : sellAmount, _DECIMALS),
    enabled: (!!buyPrice || !!sellAmount) && !!club.tokenAddress && club.chain === "lens" && club.complete,
  });

  const buyRewardSwap = async (e) => {
    e.preventDefault();
    setIsBuying(true);
    let toastId;

    const targetChainId = getChain("lens").id;
    if (chainId !== targetChainId) {
      try {
        console.log('switching to', targetChainId);
        switchChain({ chainId: targetChainId });
      } catch {
        toast.error("Please switch networks");
        setIsBuying(false);
        return;
      }
    }

    try {
      const quoteTokenAddress = WGHO_CONTRACT_ADDRESS;
      // console.log(quoteTokenAddress, maxPrice, walletClient, toastId, undefined, club.chain)

      if (club.chain === "lens" && !useBonsaiAsInput) {
        // Calculate how much WGHO we need for the transaction
        const requiredAmount = parseUnits(buyPrice, _DECIMALS);
        const currentWGHOBalance = tokenBalance || 0n;

        // If we don't have enough WGHO
        if (currentWGHOBalance < requiredAmount) {
          // Calculate how much more WGHO we need
          const additionalWGHONeeded = requiredAmount - currentWGHOBalance;

          // Check if user has enough GHO to wrap
          const ghoBalanceInWei = ghoBalance?.value || 0n;
          if (ghoBalanceInWei < additionalWGHONeeded) {
            toast.error("Insufficient GHO balance");
            setIsBuying(false);
            return;
          }

          // Wrap the required amount
          console.log("Wrapping GHO:", formatUnits(additionalWGHONeeded, _DECIMALS));
          toastId = toast.loading("Wrapping GHO...");
          // Call the deposit function on the WGHO contract
          const hash = await walletClient!.writeContract({
            address: WGHO_CONTRACT_ADDRESS,
            abi: WGHO_ABI,
            functionName: 'deposit',
            args: [],
            value: additionalWGHONeeded,
          });

          await publicClient("lens").waitForTransactionReceipt({ hash });
          toast.success("Wrapped GHO", { id: toastId });
        }
      }

      if (!quoteResult) {
        console.error("Can't calculate min amount out");
        return;
      }

      const parsedBuyPrice = parseUnits(buyPrice, _DECIMALS);
      await approveToken(useBonsaiAsInput ? PROTOCOL_DEPLOYMENT.lens.Bonsai : quoteTokenAddress, parsedBuyPrice, walletClient, toastId, undefined, club.chain, PROTOCOL_DEPLOYMENT.lens.RewardSwap);

      toastId = toast.loading("Buying", { id: toastId });
      let _buyAmount = quoteResult[0];
      const hash = await walletClient!.writeContract({
        address: ACTION_HUB_ADDRESS,
        abi: ActionHubAbi,
        functionName: "executePostAction",
        args: [
          PROTOCOL_DEPLOYMENT.lens.RewardSwap,
          // if output is Bonsai, use the global feed, since its a specific post
          club.tokenAddress == PROTOCOL_DEPLOYMENT.lens.Bonsai ? LENS_GLOBAL_FEED : LENS_BONSAI_DEFAULT_FEED,
          postId,
          [
            { key: PARAM__PATH, value: encodeAbiParameters([{ type: 'bytes' }], [calculatePath(club.tokenAddress, useBonsaiAsInput ? PROTOCOL_DEPLOYMENT.lens.Bonsai : undefined)]) },
            { key: PARAM__AMOUNT_IN, value: encodeAbiParameters([{ type: 'uint256' }], [parsedBuyPrice]) },
            { key: PARAM__AMOUNT_OUT_MINIMUM, value: encodeAbiParameters([{ type: 'uint256' }], [(9n * quoteResult[0]) / 10n]) },
            { key: PARAM__CLIENT_ADDRESS, value: encodeAbiParameters([{ type: 'address' }], [zeroAddress]) },
            { key: PARAM__REFERRALS, value: encodeAbiParameters([{ type: 'address[]' }], [[]]) },
          ],
        ],
      });

      await publicClient("lens").waitForTransactionReceipt({ hash });
      // give the indexer some time
      setTimeout(refetchClubBalance, 5000);
      setTimeout(refreshTradingInfo, 5000);
      // setTimeout(refetchClubPrice, 5000); // don't refetch price

      toast.success(`Bought ${kFormatter(parseFloat(formatUnits(_buyAmount, DECIMALS)))} $${club.token.symbol}`, { duration: 10000, id: toastId });

      if (!!useRemixReferral || club.tokenAddress === PROTOCOL_DEPLOYMENT.lens.Bonsai) {
        closeModal();
        return;
      }

      setJustBought(true);
      setShowConfetti(true);
      setJustBoughtAmount(formatUnits(_buyAmount, DECIMALS));
      // Remove confetti after 5 seconds
      setTimeout(() => setShowConfetti(false), 5000);
    } catch (error) {
      console.log(error);
      toast.error("Failed to buy", { id: toastId });
    }
    setIsBuying(false);
  }

  const sellRewardSwap = async (e) => {
    e.preventDefault();
    setIsSelling(true);
    let toastId;

    const targetChainId = getChain("lens").id;
    if (chainId !== targetChainId) {
      try {
        console.log('switching to', targetChainId);
        switchChain({ chainId: targetChainId });
      } catch {
        toast.error("Please switch networks");
        setIsSelling(false);
        return;
      }
    }

    try {
      if (!quoteResult) {
        console.error("Can't calculate min amount out");
        return;
      }

      const parsedSellAmount = parseUnits(sellAmount, _DECIMALS);
      await approveToken(club.tokenAddress, parsedSellAmount, walletClient, toastId, undefined, club.chain, PROTOCOL_DEPLOYMENT.lens.RewardSwap);

      toastId = toast.loading("Selling", { id: toastId });
      let _buyAmount = quoteResult[0];
      const hash = await walletClient!.writeContract({
        address: ACTION_HUB_ADDRESS,
        abi: ActionHubAbi,
        functionName: "executePostAction",
        args: [
          PROTOCOL_DEPLOYMENT.lens.RewardSwap,
          // use the global feed and specific post
          LENS_GLOBAL_FEED,
          SWAP_TO_BONSAI_POST_ID,
          [
            { key: PARAM__PATH, value: encodeAbiParameters([{ type: 'bytes' }], [calculatePath(PROTOCOL_DEPLOYMENT.lens.Bonsai, club.tokenAddress)]) },
            { key: PARAM__AMOUNT_IN, value: encodeAbiParameters([{ type: 'uint256' }], [parsedSellAmount]) },
            { key: PARAM__AMOUNT_OUT_MINIMUM, value: encodeAbiParameters([{ type: 'uint256' }], [(9n * quoteResult[0]) / 10n]) },
            { key: PARAM__CLIENT_ADDRESS, value: encodeAbiParameters([{ type: 'address' }], [zeroAddress]) },
            { key: PARAM__REFERRALS, value: encodeAbiParameters([{ type: 'address[]' }], [[]]) },
          ],
        ],
      });

      await publicClient("lens").waitForTransactionReceipt({ hash });
      // give the indexer some time
      setTimeout(refetchClubBalance, 5000);
      setTimeout(refreshTradingInfo, 5000);
      // setTimeout(refetchClubPrice, 5000); // don't refetch price

      toast.success(`Sold ${kFormatter(parseFloat(formatUnits(_buyAmount, DECIMALS)))} $${club.token.symbol}`, { duration: 10000, id: toastId });

      closeModal();
      return;
    } catch (error) {
      console.log(error);
      toast.error("Failed to sell", { id: toastId });
    }
    setIsSelling(false);
  }

  const urlEncodedPostParams = useMemo(() => {
    const params = {
      text: `Just aped into $${club.token.symbol} on the Launchpad @bonsai
${SITE_URL}/token/${club.chain}/${club.tokenAddress}?ref=${address}`,
    };

    return new URLSearchParams(params).toString();
  }, [club]);

  return (
    <div className="flex flex-col w-[calc(100vw-65px)] sm:w-full"
      style={{
        fontFamily: brandFont.style.fontFamily
      }
      }>
      <div className="flex items-center justify-between mb-4">
        <Tabs openTab={openTab} setOpenTab={setOpenTab} setJustBought={setJustBought} disableSell={postId === SWAP_TO_BONSAI_POST_ID} />
        {/* {(!!bonsaiBalanceNFT && bonsaiBalanceNFT > 0n) && (
          <label className="text-xs font-medium text-secondary/70 whitespace-nowrap mt-4">
            Trading Fee: $0
          </label>
        )} */}
      </div>
      <div className="w-full">
        {/* Buy */}
        {openTab === 1 && (
          <div className="w-full divide-y divide-dark-grey">
            {showConfetti && <ConfettiExplosion zIndex={99999 + 1} className="ml-40" />}
            <div className="space-y-8">
              <div className="gap-y-6 gap-x-4">
                <div className="flex flex-col">
                  <div className="flex flex-col justify-between gap-2">
                    <div className="relative flex flex-col">
                      <CurrencyInput
                        tokenImage={club.chain === "lens" ? (useBonsaiAsInput ? "/bonsai.png" : "/gho.webp") : "/usdc.png"}
                        tokenBalance={club.chain === "lens" ? (useBonsaiAsInput ? tokenBalance : (tokenBalance || 0n) + (ghoBalance?.value || 0n)) : tokenBalance}
                        price={buyPrice}
                        isError={notEnoughFunds}
                        onPriceSet={setBuyPrice}
                        symbol={club.chain === "lens" ? (useBonsaiAsInput ? "BONSAI" : "GHO") : "USDC"}
                        showMax
                        chain={club.chain}
                        secondaryToken={club.chain === "lens" && club.complete && postId !== SWAP_TO_BONSAI_POST_ID ? {
                          image: useBonsaiAsInput ? "/gho.webp" : "/bonsai.png",
                          symbol: useBonsaiAsInput ? "GHO" : "BONSAI",
                          onClick: () => setUseBonsaiAsInput(!useBonsaiAsInput)
                        } : undefined}
                      />

                      <div className="relative w-full min-h-[16px] max-h-[16px] flex justify-center">
                        <div className='backdrop-blur-[40px] absolute min-h-[28px] h-7 w-7 rounded-[10px] bg-[#333]  border-card border top-1/2 transform -translate-y-1/2 text-xs text-secondary/70'>
                          <div className="flex justify-center items-center h-full">
                            <ArrowDownIcon className="w-4 h-4 text-white" onClick={() => setOpenTab(2)} />
                          </div>
                        </div>
                      </div>

                      <CurrencyInput
                        tokenImage={club.token.image}
                        tokenBalance={clubBalance}
                        price={club.complete ? `${quoteResult ? formatUnits(quoteResult[0], DECIMALS) : 0}` : `${buyPrice && buyAmount ? formatUnits(buyAmount, DECIMALS) : 0}`}
                        isError={false}
                        onPriceSet={() => {
                          // TODO: Set USDC amount based on the token amount
                        }}
                        symbol={club.token.symbol}
                        // NOTE: as long as lens only uses wgho for quote token then the decimal factor is 36
                        overridePrice={formatUnits((BigInt(clubBalance || 0) * BigInt(club.currentPrice)), club.chain === "lens" ? 36 : 24)}
                        disabled
                        chain={club.chain}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="w-full flex flex-col justify-center items-center space-y-2">
                {!club.complete && BigInt(buyAmount || 0n) + BigInt(club.supply) >= MAX_MINTABLE_SUPPLY && <p className="max-w-sm text-center text-sm text-brand-highlight/90">This {club.chain === "lens" ? "WGHO" : "USDC"} amount goes over the liquidity threshold. Your price will be automatically adjusted to {effectiveSpend} {club.chain === "lens" ? "WGHO" : "USDC"}</p>}
                {!justBought && (
                  <>
                    <Button className="w-full hover:bg-bullish" disabled={!isConnected || isBuying ||  club.complete ? (!buyPrice || isLoadingBuyAmount) : false || !buyAmount || notEnoughFunds} onClick={club.complete ? buyRewardSwap : buyChips} variant="accentBrand">
                      Buy ${club.token.symbol}
                    </Button>
                    {club.tokenAddress === PROTOCOL_DEPLOYMENT.lens.Bonsai && (
                      <a className="link link-hover text-brand-highlight/80 cursor-pointer flex text-sm" href="https://app.uniswap.org/explore/tokens/base/0x474f4cb764df9da079d94052fed39625c147c12c?utm_medium=web" target="_blank" rel="noopener noreferrer">
                        Trade on Base <ExternalLinkIcon className="ml-1 mt-1 w-4 h-4" />
                      </a>
                    )}
                    {club.tokenAddress !== PROTOCOL_DEPLOYMENT.lens.Bonsai && (
                      <Button
                        variant={"primary"}
                        size='md'
                        className="w-full !border-none"
                        onClick={() => {
                          onBuyUSDC(buyPrice);
                        }}
                      >
                        Fund wallet
                      </Button>
                    )}
                  </>
                )}
                {/* if the post is a remix, the remixer gets the referral fee */}
                {justBought && !useRemixReferral && (
                  <div className="w-full flex flex-col items-center space-y-4">
                    <p className="text-center gradient-txt">{`You bought ${localizeNumber((justBoughtAmount || "0"), "decimal")} $${club.token.symbol}!`}</p>
                    <p className="text-center gradient-txt">{`Share and earn referral rewards`}</p>
                    <div className="flex flex-row md:flex-row flex-col items-center md:space-x-2 space-y-2 md:space-y-0">
                      <a href={`https://orb.club/create-post?${urlEncodedPostParams}`} target="_blank" rel="noopener noreferrer" className="w-full">
                        <Button className="w-[150px] bg-black hover:bg-black">
                          <img src="/svg/orb-logo-white.svg" alt="X Logo" className="mr-2 w-4 h-4" />
                          Orb
                        </Button>
                      </a>
                      <a href={tweetIntentTokenReferral({
                        text: `Just aped into $${club.token.symbol} on the Launchpad @onbonsai`,
                        chain: club.chain,
                        tokenAddress: club.tokenAddress,
                        referralAddress: address!
                      })} target="_blank" rel="noopener noreferrer" className="w-full">
                        <Button variant="accent" className="w-[150px] flex items-center justify-center">
                          <img src="/svg/X_logo_2023.svg" alt="X Logo" className="w-4 h-4" />
                        </Button>
                      </a>
                      <a href={castIntentTokenReferral({
                        text: `Just aped into $${club.token.symbol} on the Launchpad @onbonsai`,
                        chain: club.chain,
                        tokenAddress: club.tokenAddress,
                        referralAddress: address!
                      })} target="_blank" rel="noopener noreferrer" className="w-full">
                        <Button className="w-[150px] bg-[#472a91] hover:bg-[#472a91] text-white">
                          Warpcast
                        </Button>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Sell */}
        {openTab === 2 && (
          <div className="w-full space-y-8 divide-y divide-dark-grey">
            <div className="space-y-8">
              <div className="gap-y-6 gap-x-4">
                <div className="flex flex-col">
                  <div className="flex flex-col justify-between gap-2">
                    <div className="relative flex flex-col">
                      <CurrencyInput
                        tokenImage={club.token.image}
                        tokenBalance={clubBalance}
                        price={sellAmount}
                        isError={sellAmountError}
                        onPriceSet={setSellAmount}
                        symbol={club.token.symbol}
                        showMax
                        chain={club.chain}
                      />

                      <div className="relative w-full min-h-[16px] max-h-[16px] flex justify-center">
                        <div className='backdrop-blur-[40px] absolute min-h-[28px] h-7 w-7 rounded-[10px] bg-[#333]  border-card border top-1/2 transform -translate-y-1/2 text-xs text-secondary/70'>
                          <div className="flex justify-center items-center h-full">
                            <ArrowDownIcon className="w-4 h-4 text-white" onClick={() => setOpenTab(1)} />
                          </div>
                        </div>
                      </div>

                      <CurrencyInput
                        tokenImage={club.chain === "lens" ? (club.complete ? "/bonsai.png" : "/gho.webp") : "/usdc.png"}
                        tokenBalance={tokenBalance || 0n}
                        price={club.complete ? `${quoteResult ? formatUnits(quoteResult[0], DECIMALS) : 0}` : sellPrice && sellAmount ? sellPriceFormatted.replaceAll(",", "") : "0"}
                        isError={false}
                        onPriceSet={() => { }}
                        symbol={club.chain === "lens" ? (club.complete ? "BONSAI" : "WGHO") : "USDC"}
                        disabled
                        chain={club.chain}
                      />
                      {/* <div className="relative">
                        <input
                          type="number"
                          step="1"
                          placeholder="0.0"
                          value={sellAmount}
                          className="block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent pr-12 shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"
                          onChange={(e) => setSellAmount(e.target.value)}
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary text-xs">{clubBalance ? roundedToFixed(parseFloat(formatUnits(clubBalance, DECIMALS)), 2) : 0.0}{" "}{club.token.symbol}</span>
                      </div>
                      <div className="flex justify-between">
                        {[10, 25, 50, 100].map((percent) => (
                          <Button
                            key={percent}
                            size="sm"
                            onClick={() => setSellAmount(clubBalance ? formatUnits((clubBalance * BigInt(percent)) / BigInt(100), DECIMALS) : '0')}
                          >
                            {percent}%
                          </Button>
                        ))}
                      </div>
                      <span
                        className={`absolute right-3 top-full mt-2 text-xs ${sellAmountError ? 'text-brand-highlight/90' : 'text-secondary/70'}`}
                      >
                        You will receive:{" $"}{sellPriceFormatted}
                      </span> */}
                    </div>


                  </div>
                </div>
              </div>
              <div className="pt-4 w-full flex justify-center items-center">
                <Button className="w-full hover:bg-bullish" disabled={!isConnected || isSelling || !sellAmount || isLoadingSellPrice || !sellPriceAfterFees || club.supply == (Number(sellAmount) * 1e6)} onClick={club.complete ? sellRewardSwap : sellChips} variant="accentBrand">
                  Sell ${club.token.symbol}
                </Button>
              </div>
            </div>
          </div>
        )}

        {!isConnected && (
          <div className="flex items-center justify-center w-full h-full mt-2">
            <p className="!text-bearish">Log In with your wallet to begin trading</p>
          </div>
        )}
      </div>
    </div >
  );
};

const Tabs = ({ openTab, setOpenTab, setJustBought, disableSell = false }) => {
  return (
    <div
      className="flex w-full"
      style={{
        fontFamily: brandFont.style.fontFamily,
      }}
    >
      <ul className="nav nav-pills flex flex-row flex-wrap list-none w-full" id="pills-tab" role="tablist">
        <li className="nav-item" role="presentation">
          <button
            onClick={() => {
              setOpenTab(1);
              setJustBought(false);
            }}
            className={clsx(`
            nav-link
            block
            rounded
            w-full
            text-center
            md:w-auto
            mr-2
            focus:outline-none focus:ring-0`)}
          >
            <Header2Text className={clsx("font-sans", openTab === 1 ? "text-white" : "text-white/30")}>Buy</Header2Text>
          </button>
        </li>
        {!disableSell && (
          <li className="nav-item" role="presentation">
            <button
              onClick={() => {
                setOpenTab(2);
                setJustBought(false);
              }}
              className={clsx(`
          nav-link
          block
          rounded
          w-full
          text-center
          md:w-auto
          mr-2
          focus:outline-none focus:ring-0`)}
            >
              <Header2Text className={clsx(openTab === 2 ? "text-white" : "text-white/30")}>Sell</Header2Text>
            </button>
          </li>
        )}
      </ul>
    </div>
  );
};
