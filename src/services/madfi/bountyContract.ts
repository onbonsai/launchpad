import { waitForTransactionReceipt } from "@wagmi/core";
import axios from "axios";
import { createPublicClient, formatUnits, http, parseUnits, erc20Abi } from "viem";
import { base, polygon, polygonMumbai } from "wagmi/chains";
import toast from "react-hot-toast";
import { groupBy } from "lodash";

import { ACCEPTED_PAYMENT_STABLE_CHAINID, ADMIN_WALLET, MAX_UINT } from "@src/constants/constants";
import { SettleData, isObjectEmpty } from "@src/utils/utils";
import { getEventFromReceipt, getEventsFromReceipt } from "@src/utils/viem";
import { IS_PRODUCTION } from "@src/constants/constants";
import { apiUrls } from "@src/constants/apiUrls";
import { validChainId } from "@src/constants/validChainId";
import { LENSHUB_PROXY } from "@src/services/lens/utils";
import { Events } from "@src/services/lens/events";
import { BOUNTIES_CONTRACT_ADDRESS } from "@src/services/madfi/utils";
import { encodeAbi } from "@src/utils/viem";
import { configureChainsConfig } from "@src/utils/wagmi";

import { PUBLICATION_BOUNTY_ACTION_MODULE } from "./utils";
import bountyABI from "./abi/Bounties.json";
import { sendTweets } from "../twitter/sendTweets";

export const createBounty = async (token: string, budget: string, sponsorCollectionId: string, walletClient: any) => {
  try {
    const budgetInvoice = await convertDecimals(budget, token as `0x${string}`);
    const hash = await walletClient.writeContract({
      address: BOUNTIES_CONTRACT_ADDRESS,
      abi: bountyABI,
      functionName: "deposit",
      args: [token, budgetInvoice, sponsorCollectionId],
    });
    const transactionReceipt = await waitForTransactionReceipt(configureChainsConfig, { hash });
    const bountyCreatedEvent = getEventFromReceipt({
      transactionReceipt,
      contractAddress: BOUNTIES_CONTRACT_ADDRESS,
      abi: bountyABI,
      eventName: "BountyCreated",
    });

    const { bountyId } = bountyCreatedEvent.args;

    return { bountyId, budgetInvoice };
  } catch (error) {
    console.error(error);
    return { bountyId: undefined, budgetInvoice: 0 };
  }
};

export const createBountySticker = async (ipfsUri: string, sponsorCollectionId: number | string, walletClient: any) => {
  try {
    const hash = await walletClient.writeContract({
      address: BOUNTIES_CONTRACT_ADDRESS,
      abi: bountyABI,
      functionName: "depositNft",
      args: [ipfsUri, sponsorCollectionId],
    });
    const transactionReceipt = await waitForTransactionReceipt(configureChainsConfig, { hash });
    const bountyCreatedEvent = getEventFromReceipt({
      transactionReceipt,
      contractAddress: BOUNTIES_CONTRACT_ADDRESS,
      abi: bountyABI,
      eventName: "BountyCreated",
    });

    const { bountyId } = bountyCreatedEvent.args;

    return { bountyId };
  } catch (error) {
    console.error(error);
    return { bountyId: undefined, budgetInvoice: 0 };
  }
};

export const settleBounty = async (
  paymentToken: string,
  bountyId: string,
  bountyObjectId: string,
  walletClient: any,
  ids: SettleData,
  retry = false,
  isSticker = false,
) => {
  let toastId = toast.loading("Prepping bids for settlement...");
  const idCount = ids.ids?.length;
  const {
    data: { bids },
  } = await axios.post("/api/bounties/fetch-bids", {
    bountyId: bountyId.toString(),
    includeSigs: true,
    validateTwitter: true,
    ...ids,
  });
  // replace ids with the ones that were validated in the backend (filters out invalid twitter oauth)
  ids.ids = bids.map(({ _id }: { _id: any }) => _id.toString());
  if (ids.ids?.length == 0) {
    toast.dismiss(toastId);
    toast.error("Selected twitter bids have invalid authorization", { duration: 5000 });
    return;
  } else if (ids.ids?.length !== idCount) {
    toast.error("Some twitter bids are invalid. The remaining bids will be processed", { duration: 5000 });
  }

  const lensPosts = bids.filter((b: any) => b.platform === "lens");
  const twitterBids = bids.filter((b: any) => b.platform === "twitter");

  // run settlement
  const settlementProgress: any = {};
  let hash, bidPubIds, lensPostCreatedTxReceipt, twitterPostCreatedTxReceipt;
  try {
    if (isSticker) {
      // lens posts for sticker bounty
      if (lensPosts.length > 0) {
        toast.dismiss(toastId);
        toastId = toast.loading(`Creating Lens posts and sending rewards...`);
        hash = await walletClient.writeContract({
          address: BOUNTIES_CONTRACT_ADDRESS,
          abi: bountyABI,
          functionName: lensPosts[0].withSigData.postParams ? "nftSettle" : "nftSettleQuote",
          args: [bountyId, lensPosts.map((b: any) => b.withSigData)],
          gas: 370_000 * (lensPosts.length + 1),
        });
        lensPostCreatedTxReceipt = await waitForTransactionReceipt(configureChainsConfig, { hash });
        settlementProgress.lens = true;
      }

      // twitter posts for sticker bounty
      if (twitterBids.length > 0) {
        toast.dismiss(toastId);
        toastId = toast.loading(`Sending rewards for Twitter posts...`);
        hash = await walletClient.writeContract({
          address: BOUNTIES_CONTRACT_ADDRESS,
          abi: bountyABI,
          functionName: "nftSettlePayOnly",
          args: [bountyId, twitterBids.map((b: any) => b.creator)],
          gas: 370_000 * (twitterBids.length + 1),
        });
        twitterPostCreatedTxReceipt = await waitForTransactionReceipt(configureChainsConfig, { hash });
        settlementProgress.twitterTx = true;

        toast.dismiss(toastId);
        toastId = toast.loading("Creating Twitter posts...");
        await sendTweets(twitterBids);
        settlementProgress.twitterPosts = true;
      }
    } else {
      // lens posts
      if (lensPosts.length > 0) {
        toast.dismiss(toastId);
        toastId = toast.loading(`Creating Lens posts and sending payouts...`);
        hash = await walletClient.writeContract({
          address: BOUNTIES_CONTRACT_ADDRESS,
          abi: bountyABI,
          functionName: lensPosts[0].withSigData.postParams ? "rankedSettle" : "rankedSettleQuote",
          args: [
            Number(bountyId),
            lensPosts.map((b: any) => b.withSigData),
            500, // fee - TODO: make this dynamic
          ],
          gas: 370_000 * (lensPosts.length + 1),
        });
        lensPostCreatedTxReceipt = await waitForTransactionReceipt(configureChainsConfig, { hash });
        settlementProgress.lens = true;
      }

      // twitter posts
      if (twitterBids.length > 0) {
        toast.dismiss(toastId);
        toastId = toast.loading(`Sending payouts for Twitter posts...`);
        const hashTwitter = await walletClient.writeContract({
          address: BOUNTIES_CONTRACT_ADDRESS,
          abi: bountyABI,
          functionName: "rankedSettlePayOnly",
          args: [
            Number(bountyId),
            twitterBids.map((i: any) => ({
              bid: i.withSigData.bid,
              recipient: i.withSigData.recipient,
              revShare: i.withSigData.revShare,
            })),
            twitterBids.map((i: any) => i.withSigData.signature),
            500, // fee - TODO: make this dynamic
          ],
          gas: 370_000 * (twitterBids.length + 1),
        });
        twitterPostCreatedTxReceipt = await waitForTransactionReceipt(configureChainsConfig, { hash: hashTwitter });
        settlementProgress.twitterTx = true;

        toast.dismiss(toastId);
        toastId = toast.loading("Creating Twitter posts...");
        await sendTweets(twitterBids);
        settlementProgress.twitterPosts = true;
      }
    }
    settlementProgress.completed = true;
    if (lensPostCreatedTxReceipt && lensPosts.length > 0) {
      const postCreatedEvents: any[] = getEventsFromReceipt({
        contractAddress: LENSHUB_PROXY,
        transactionReceipt: lensPostCreatedTxReceipt,
        abi: Events,
        eventName: "PostCreated",
      });
      const grouped = groupBy(bids, "lens.id");
      bidPubIds = postCreatedEvents
        .map(({ args }, idx) => {
          const profileHexValue = args.postParams.profileId.toString(16);
          const profileId = `0x${
            profileHexValue.length === 3 ? profileHexValue.padStart(4, "0") : profileHexValue.padStart(2, "0")
          }`;
          const hexValue = args.pubId.toString(16);
          const pubId = `0x${hexValue.length === 3 ? hexValue.padStart(4, "0") : hexValue.padStart(2, "0")}`;
          if (grouped[profileId]) {
            return { _id: lensPosts[idx]._id, publicationId: `${profileId}-${pubId}`, pubId };
          }
        })
        .filter((b) => b);
    }

    await axios.post("/api/bounties/pay-out", {
      bountyId: bountyId.toString(),
      bountyObjectId,
      paymentToken,
      ...ids,
      bidPubIds,
      settlementProgress,
    });
    toast.dismiss(toastId);
    toast.success("Complete!", { duration: 5000 });
  } catch (error) {
    console.error(error);
    toast.dismiss(toastId);
    if (!isObjectEmpty(settlementProgress)) {
      await axios.post("/api/bounties/pay-out", {
        bountyId: bountyId.toString(),
        bountyObjectId,
        paymentToken,
        ...ids,
        bidPubIds,
        settlementProgress,
      });
      toast.error("Your order was partially completed, the status has been saved", { duration: 3000 });
    } else {
      toast.error("There was an error, please try again", { duration: 3000 });
    }
  }
};

export const topUpBounty = async ({ _id, id, paymentToken }, amount: number | string, walletClient: any) => {
  try {
    const totalInvoice = await convertDecimals(amount.toString(), paymentToken);
    const hash = await walletClient.writeContract({
      address: BOUNTIES_CONTRACT_ADDRESS,
      abi: bountyABI,
      functionName: "topUp",
      args: [id, totalInvoice],
      // gas: 200_000,
    });
    await waitForTransactionReceipt(configureChainsConfig, { hash });
    if (_id) {
      await axios.post("/api/bounties/update-bounty", {
        _id,
        amount: amount.toString(),
        totalInvoice: totalInvoice.toString(),
      });
    }
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const closeBounty = async (bountyObjectId: string, bountyId: number | string, walletClient: any) => {
  let toastId;
  try {
    toastId = toast.loading("Closing bounty - please stay on the page until the transaction completes");
    const hash = await walletClient.writeContract({
      address: BOUNTIES_CONTRACT_ADDRESS,
      abi: bountyABI,
      functionName: "close",
      args: [bountyId],
      gas: 500_000
    });
    await waitForTransactionReceipt(configureChainsConfig, { hash });
    await axios.post("/api/bounties/close-bounty", { _id: bountyObjectId });
    toast.dismiss(toastId);
    toast.success("Bounty closed", { duration: 5000 });
  } catch (error) {
    console.error(error);
    toast.dismiss(toastId);
    toast.error("There was an error closing your bounty");
  }
};

export const getBounty = async (bountyId: number | string) => {
  const publicClient = createPublicClient({
    chain: IS_PRODUCTION ? polygon : polygonMumbai,
    transport: http(apiUrls.rpc),
  });
  return await publicClient.readContract({
    address: BOUNTIES_CONTRACT_ADDRESS,
    abi: bountyABI,
    functionName: "bounties",
    args: [bountyId],
  });
};

// ERC20 approval
export const approveToken = async (
  token: string,
  amount: string | bigint,
  walletClient: any,
  operator: string = BOUNTIES_CONTRACT_ADDRESS,
  toastId?,
  approveMessage = "Approving tokens...",
) => {
  const publicClient = createPublicClient({
    chain: IS_PRODUCTION ? polygon : polygonMumbai,
    transport: http(apiUrls.rpc),
  });
  const [user] = await walletClient.getAddresses();
  const allowance = await publicClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: "allowance",
    args: [user, operator],
  });
  const decimalAmount = typeof amount === "bigint"
    ? amount
    : await convertDecimals(amount, token as `0x${string}`);

  if (allowance < decimalAmount) {
    toastId = toast.loading(approveMessage);
    const hash = await walletClient.writeContract({
      address: token,
      abi: erc20Abi,
      functionName: "approve",
      args: [operator, MAX_UINT],
    });
    await waitForTransactionReceipt(configureChainsConfig, { hash });

    toast.dismiss(toastId);
  }
};

export const getDecimals = async (address: `0x${string}`, isBase = false) => {
  const publicClient = createPublicClient({
    chain: isBase ? base : IS_PRODUCTION ? polygon : polygonMumbai,
    transport: http(apiUrls.rpc),
  });
  return await publicClient.readContract({
    address,
    abi: [
      {
        inputs: [],
        name: "decimals",
        outputs: [
          {
            internalType: "uint8",
            name: "",
            type: "uint8",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
    ],
    functionName: "decimals",
  });
};

export const roundToDecimals = (num: string, decimalPlaces: number): string => {
  const [whole, fractional] = num.split(".");
  if (!fractional || fractional.length <= decimalPlaces) {
    return num;
  }
  return `${whole}.${fractional.slice(0, decimalPlaces)}`;
};

/**
 * Converts token amount into base unit (wei) based on contract decimals
 * @param amount token amount
 * @return converted amount
 */
export const convertDecimals = async (amount: string, address: `0x${string}`, isBase = false, dec?: number) => {
  const decimals = dec ? dec : Number(await getDecimals(address, isBase));
  return parseUnits(amount, decimals);
};

/**
 * Converts token amount from base unit (wei) into standard unit based on contract decimals
 * @param amount token amount in base unit
 * @param address token contract address
 * @return converted amount in standard unit
 */
export const convertFromBaseUnit = async (amount: bigint, address: `0x${string}`) => {
  const decimals = Number(await getDecimals(address));
  return formatUnits(amount, decimals);
};

export const convertDecimalsList = async (amounts: string[], address: `0x${string}`) => {
  const decimals = Number(await getDecimals(address));
  return amounts.map((amount) => parseUnits(roundToDecimals(amount, decimals), decimals));
};

/**
 * Calculates total budget with fee bps
 * @param amount budget amount
 * @param feeBps bps for the fee to apply on top
 * @returns BigInt of budget amount with fee
 */
export const budgetWithFee = (amount: bigint, feeBps: number) => {
  const divisor = BigInt(10000);
  return amount + (BigInt(feeBps) * amount) / divisor;
};

// send USDC
// TODO: correct abi for USDC, switch address based on chain id
export const payUSDC = async (amount: string, walletClient: any) => {
  const chainId = walletClient.chain.id;
  const { address, symbol } = ACCEPTED_PAYMENT_STABLE_CHAINID[chainId];
  const convertedAmount = await convertDecimals(amount, address, chainId === 8453, 6);
  const toastId = toast.loading(`Sending ${symbol}`);

  try {
    const hash = await walletClient.writeContract({
      address,
      abi: [
        {
          inputs: [
            {
              internalType: "address",
              name: "to",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "amount",
              type: "uint256",
            },
          ],
          name: "transfer",
          outputs: [
            {
              internalType: "bool",
              name: "",
              type: "bool",
            },
          ],
          stateMutability: "nonpayable",
          type: "function",
        },
      ],
      functionName: "transfer",
      args: [ADMIN_WALLET, convertedAmount],
    });

    await waitForTransactionReceipt(configureChainsConfig, { hash });

    toast.dismiss(toastId);

    return hash;
  } catch (error: any) {
    toast.dismiss(toastId);
    throw new Error(error);
  }
};

// for sticker bounties each sig has a nonce so it can be used only once
export const getNftSettleNonces = async (bountyId, address) => {
  const publicClient = createPublicClient({
    chain: IS_PRODUCTION ? polygon : polygonMumbai,
    transport: http(apiUrls.rpc),
  });
  return await publicClient.readContract({
    address: BOUNTIES_CONTRACT_ADDRESS,
    abi: bountyABI,
    functionName: "nftSettleNonces",
    args: [bountyId, address],
  });
};

// to be used in backend services
export const readContract = async ({ functionName, args }: { functionName: string; args: any[] }) => {
  const publicClient = createPublicClient({
    chain: IS_PRODUCTION ? polygon : polygonMumbai,
    transport: http(apiUrls.rpc),
  });

  return await publicClient.readContract({
    address: BOUNTIES_CONTRACT_ADDRESS,
    abi: bountyABI,
    functionName,
    args,
  });
};

export const getPublicationInitData = (paymentToken: `0x${string}`, bountyAmount: bigint, sponsorCollectionId: string) => (
  encodeAbi(
    ['address', 'uint256', 'uint256'],
    [paymentToken, bountyAmount, sponsorCollectionId]
  )
);

// PublicationBountyAction
export const getPublicationActionParams = (
  pointedProfileId: string,
  pointedPubId: string,
  actorProfileId: string,
  paymentToken: `0x${string}`,
  bountyAmount: bigint,
  sponsorCollectionId: string,
) => {
  const encodedActionParams = encodeAbi(
    ['address', 'uint256', 'uint256'],
    [paymentToken, bountyAmount, sponsorCollectionId]
  );

  return {
    publicationActedProfileId: pointedProfileId,
    publicationActedId: pointedPubId,
    actorProfileId,
    referrerProfileIds: [],
    referrerPubIds: [],
    referrerPubTypes: [],
    actionModuleAddress: PUBLICATION_BOUNTY_ACTION_MODULE,
    actionModuleData: encodedActionParams,
  };
};