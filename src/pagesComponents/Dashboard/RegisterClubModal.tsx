import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useAccount, useWalletClient, useSwitchChain, useReadContract } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { InformationCircleIcon } from "@heroicons/react/solid";
import { Dialog } from "@headlessui/react";
import toast from "react-hot-toast"

import { Button } from "@src/components/Button"
import { Tooltip } from "@src/components/Tooltip";
import { roundedToFixed } from "@src/utils/utils";
import { useGetRegistrationFee } from "@src/hooks/useMoneyClubs";
import {
  DECIMALS,
  CONTRACT_CHAIN_ID,
  USDC_CONTRACT_ADDRESS,
  USDC_DECIMALS,
  registerClub as registerClubTransaction,
  approveToken,
} from "@src/services/madfi/moneyClubs";
import { ImageUploader } from "@src/components/ImageUploader/ImageUploader";
import { pinFile, storjGatewayURL, pinJson } from "@src/utils/storj";
import publicationBody from "@src/services/lens/publicationBody";
import { createPostMomoka } from "@src/services/lens/createPost";
import { useAuthenticatedLensProfile } from "@src/hooks/useLensProfile";
import { MADFI_CLUBS_URL } from "@src/constants/constants";
import { LAUNCHPAD_CONTRACT_ADDRESS } from "@src/services/madfi/utils";
import BonsaiLaunchpadAbi from "@src/services/madfi/abi/BonsaiLaunchpad.json";

export const RegisterClubModal = ({
  profile,
  closeModal,
  refetchRegisteredClub,
  refetchClubBalance,
  tokenBalance, // balance in USDC
  bonsaiNftZkSync, // bonsai nft balance
}) => {
  const router = useRouter();
  const { chain, address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();
  const [initialSupply, setInitialSupply] = useState<number>(1);
  const [curveType, setCurveType] = useState<number>(1);
  const [tokenName, setTokenName] = useState<string>("");
  const [tokenSymbol, setTokenSymbol] = useState<string>("");
  const [tokenDescription, setTokenDescription] = useState<string>("");
  const [strategy, setStrategy] = useState<string>("lens");
  const [isBuying, setIsBuying] = useState(false);
  const [tokenImage, setTokenImage] = useState<any[]>([]);

  const { data: authenticatedProfile } = useAuthenticatedLensProfile();
  const { data: totalRegistrationFee, isLoading: isLoadingRegistrationFee } = useGetRegistrationFee(curveType, initialSupply || 0, address);
  const isValid = tokenName && tokenSymbol && tokenBalance > (totalRegistrationFee || 0n) && !!tokenImage;

  const { data: registrationCost } = useReadContract({
    address: LAUNCHPAD_CONTRACT_ADDRESS,
    abi: BonsaiLaunchpadAbi,
    chainId: CONTRACT_CHAIN_ID,
    functionName: 'registrationCost'
  });

  const buyPriceFormatted = useMemo(() => (
    roundedToFixed(parseFloat(formatUnits(totalRegistrationFee || 0n, USDC_DECIMALS)), 4)
  ), [totalRegistrationFee, isLoadingRegistrationFee]);

  const registrationFee = useMemo(() => (
    bonsaiNftZkSync > 0n ? '0' : (registrationCost?.toString() || '-')
  ), [registrationCost]);

  const registerClub = async () => {
    setIsBuying(true);
    let toastId;

    if (chain!.id !== CONTRACT_CHAIN_ID) {
      try {
        switchChain({ chainId: CONTRACT_CHAIN_ID });
      } catch {
        toast.error("Please switch networks");
        setIsBuying(false);
      }
      return;
    }

    try {
      await approveToken(USDC_CONTRACT_ADDRESS, totalRegistrationFee!, walletClient, toastId)

      toastId = toast.loading("Creating token...");
      const _tokenImage = storjGatewayURL(await pinFile(tokenImage[0]));
      const featureStartAt = bonsaiNftZkSync > 0n ? Math.floor(Date.now() / 1000) : undefined;
      const { objectId, clubId } = await registerClubTransaction(walletClient, {
        initialSupply: parseUnits((initialSupply || 0).toString(), DECIMALS).toString(),
        curveType,
        strategy,
        tokenName,
        tokenSymbol,
        tokenImage: _tokenImage,
        tokenDescription,
        featureStartAt
      });
      if (!(objectId && clubId)) throw new Error("failed");

      toastId = toast.loading("Preparing post...", { id: toastId });
      const pubId = await createPost(clubId!, {
        item: _tokenImage,
        type: tokenImage[0].type,
        altTag: tokenImage[0].name,
      });
      if (!pubId) throw new Error("Failed to create post");

      const response = await fetch('/api/clubs/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updateRecord: {
            id: objectId,
            pubId
          }
        })
      });
      if (!response.ok) throw new Error("Failed to link publication");

      setTimeout(refetchRegisteredClub, 8000); // give the indexer some time
      setTimeout(refetchClubBalance, 8000); // give the indexer some time
      setIsBuying(false);

      // toast.success("Token created! Share your Frame URL to invite your community", { duration: 10000, id: toastId });
      toast.success("Token created! Redirecting...", { duration: 10000, id: toastId });
      closeModal();
      setTimeout(() => router.push(`/token/${clubId}`), 3000);
    } catch (error) {
      setIsBuying(false);
      console.log(error);
      toast.error("Failed", { id: toastId });
    }
  };

  const createPost = async (clubId: string, attachment: any) => {
    try {
      const publicationMetadata = publicationBody(
        `${tokenName} ($${tokenSymbol})
${tokenDescription}
${MADFI_CLUBS_URL}/token/${clubId}
`,
        [attachment],
        profile.metadata?.displayName || profile.handle!.suggestedFormatted.localName
      );

      // creating a post on momoka
      const { data: postIpfsHash } = await pinJson(publicationMetadata);
      const broadcastResult = await createPostMomoka(
        walletClient,
        storjGatewayURL(`ipfs://${postIpfsHash}`),
        authenticatedProfile,
      );

      // broadcastResult might be the `pubId` if it was a wallet tx
      if (broadcastResult) {
        // create seo image
        return typeof broadcastResult === "string"
          ? broadcastResult
          : broadcastResult.id || broadcastResult.txHash || `${authenticatedProfile?.id}-${broadcastResult?.toString(16)}`;
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="flex flex-col w-full mt-8">
      <Dialog.Title as="h2" className="text-5xl uppercase text-center font-owners font-bold">
        Create a token
      </Dialog.Title>
      <form
        className="p-4 mx-auto max-w-fit min-w-[50%] space-y-4 divide-y divide-dark-grey"
      >
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-y-4 gap-x-8 sm:grid-cols-6">

            {/* Linked social profile */}
            {/* <div className="sm:col-span-6 flex flex-col">
                <div className="flex flex-col justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <label className="inline-block text-sm font-medium text-secondary">
                      Linked social profile
                    </label>
                    <div className="text-sm inline-block">
                      <Tooltip message="Your token will have a social feed, and by default use your currently logged-in Lens profile" direction="top">
                        <InformationCircleIcon
                          width={18}
                          height={18}
                          className="inline-block -mt-1 text-secondary mr-1"
                        />
                      </Tooltip>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 max-w-fit flex-wrap">
                  {[{ strategy: "lens", label: `@${authenticatedProfileHandle}` }].map(({ strategy: _strategy, label }) => (
                    <label
                      key={_strategy}
                      htmlFor={`curve-${_strategy}`}
                      className="mt-2 text-sm text-secondary flex items-center justify-center gap-2 bg-dark-grey rounded-md p-2 min-w-[100px]"
                    >
                      <input
                        type="radio"
                        className="h-5 w-5 border-none text-primary focus:ring-primary/70"
                        value={_strategy}
                        id={`strategy-${_strategy}`}
                        name="strategy"
                        onChange={(e) => setStrategy(e.target.value)}
                        checked={strategy === _strategy}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div> */}

            <div className="sm:col-span-3 flex flex-col">
              <div className="flex flex-col justify-between gap-2">
                <div className="flex items-center gap-2">
                  <label className="inline-block text-sm font-medium text-secondary">
                    Name
                  </label>
                  <div className="text-sm inline-block">
                    <Tooltip message="Once your token reaches the liquidity threshold, a uni v4 pool will be created with this token name and symbol" direction="top">
                      <InformationCircleIcon
                        width={18}
                        height={18}
                        className="inline-block -mt-1 text-secondary mr-1"
                      />
                    </Tooltip>
                  </div>
                </div>
                <div>
                  <input
                    type="text"
                    value={tokenName}
                    className="block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent pr-12 shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"
                    onChange={(e) => { setTokenName(e.target.value); setTokenSymbol(e.target.value.substring(0, 6).toUpperCase()); }}
                  />
                </div>
              </div>
            </div>
            <div className="sm:col-span-3 flex flex-col">
              <div className="flex flex-col justify-between gap-2">
                <div className="flex items-center gap-2">
                  <label className="inline-block text-sm font-medium text-secondary">
                    Token symbol
                  </label>
                </div>
                <div>
                  <input
                    type="text"
                    value={tokenSymbol}
                    className="block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent pr-12 shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"
                    onChange={(e) => setTokenSymbol(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="sm:col-span-6 flex flex-col">
              <div className="flex flex-col justify-between gap-2">
                <div className="flex items-center gap-2">
                  <label className="inline-block text-sm font-medium text-secondary">
                    Description
                  </label>
                </div>
                <div>
                  <textarea
                    value={tokenDescription}
                    className="block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent pr-12 shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"
                    onChange={(e) => setTokenDescription(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="sm:col-span-6 flex flex-col">
              <div className="flex flex-col justify-between">
                <div className="flex items-center">
                  <label className="inline-block text-sm font-medium text-secondary">
                    Token image
                  </label>
                </div>
                <div>
                  <ImageUploader files={tokenImage} setFiles={setTokenImage} maxFiles={1} />
                </div>
              </div>
            </div>

            <div className="sm:col-span-3 flex flex-col justify-center items-center">
              <div className="flex flex-col justify-between gap-2">
                <div className="flex items-center gap-2">
                  <label className="inline-block text-sm font-medium text-secondary">
                    Bonding curve pricing
                  </label>
                  <div className="text-sm inline-block">
                    <Tooltip message="A more expensive bonding curve leads to faster pool creation" direction="top">
                      <InformationCircleIcon
                        width={18}
                        height={18}
                        className="inline-block -mt-1 text-secondary mr-1"
                      />
                    </Tooltip>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 max-w-fit flex-wrap">
                {[{ curveType: 0, label: 'Cheap' }, { curveType: 1, label: 'Normal' }, { curveType: 2, label: 'Expensive' }].map(({ curveType: _curveType, label }) => (
                  <label
                    key={_curveType}
                    htmlFor={`curve-${_curveType}`}
                    className="mt-2 text-sm text-secondary flex items-center justify-center gap-2 bg-dark-grey rounded-md p-2 min-w-[100px]"
                  >
                    <input
                      type="radio"
                      className="h-5 w-5 border-none text-primary focus:ring-primary/70"
                      value={_curveType}
                      id={`curve-${_curveType}`}
                      name="curveType"
                      onChange={(e) => setCurveType(parseInt(e.target.value))}
                      checked={curveType === _curveType}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="sm:col-span-3 flex flex-col">
              <div className="flex flex-col justify-between gap-2">
                <div className="flex justify-between">
                  <div className="flex items-center gap-2">
                    <label className="inline-block text-sm font-medium text-secondary">
                      Buy initial supply
                    </label>
                    <div className="text-sm inline-block">
                      <Tooltip message="Buying the initial supply is optional, but recommended" direction="top">
                        <InformationCircleIcon
                          width={18}
                          height={18}
                          className="inline-block -mt-1 text-secondary mr-1"
                        />
                      </Tooltip>
                    </div>
                  </div>
                  <label className="inline-block text-xs font-medium text-secondary/70">
                    Fee: ${registrationFee}
                  </label>
                </div>
                <div className="relative flex flex-col space-y-1">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="1"
                      value={initialSupply}
                      className="block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent pr-12 shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"
                      placeholder="0.0"
                      onChange={(e) => setInitialSupply(parseFloat(e.target.value))}
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary text-xs">{tokenSymbol}</span>
                  </div>

                  <div className="absolute left-1/2 transform -translate-x-1/2 bg-black/70 rounded-full p-1 shadow-md top-6 z-10">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-secondary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  <div className="relative flex-1">
                    <input
                      type="number"
                      className={"block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent pr-12 shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"}
                      value={buyPriceFormatted}
                      disabled
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary text-xs">USDC</span>
                  </div>
                  <p className={`absolute right-2 top-full mt-2 text-xs ${tokenBalance < (totalRegistrationFee || 0n) ? 'text-primary/90' : 'text-secondary/70'}`}>
                    Balance: {tokenBalance ? roundedToFixed(parseFloat(formatUnits(tokenBalance, USDC_DECIMALS)), 2) : 0.0}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-8 flex flex-col gap-4 justify-center items-center">
            <Button disabled={isBuying || !isValid} onClick={registerClub} variant="primary">
              Create
            </Button>
            <p className="text-sm text-secondary font-light">
              Creating will also make a post from your profile
            </p>
            {(bonsaiNftZkSync > 0n) && (
              <p className="text-sm text-secondary font-light gradient-txt">
                For being a Bonsai NFT holder, your token will be featured for 48 hours
              </p>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
