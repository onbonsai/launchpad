import { MongoClient, Db } from "mongodb";
import { formatEther } from "viem";
import { ApolloClient, InMemoryCache, gql, HttpLink } from "@apollo/client/core";
import fetch from "cross-fetch";
import { NextApiRequest, NextApiResponse } from "next";

// Configuration from cron job
const SUBGRAPH_URL = `https://gateway.thegraph.com/api/${process.env.SUBGRAPH_API_KEY}/subgraphs/id/EHPwY2LhhhaxiCindhLuUVJRF4teH9BnzFRfVULsf8px`;
const MONGO_URI = process.env.MONGO_URI || "";
const FREE_TIER_CREDITS = 10;
const TIER1_RATE = 0.5; // Credits per dollar for first $20
const TIER1_MAX = 20; // First $20 staked
const TIER2_RATE = 0.25; // Credits per dollar for $21-$100
const TIER2_MAX = 100; // Up to $100 staked
const TIER3_RATE = 0.1; // Credits per dollar for $101+
const MAX_STAKING_CREDITS = 200; // Maximum staking credits (without multipliers)
const DATABASE_NAME = "client-bonsai";
const CREDITS_COLLECTION = "api-credits";
const TWAP_COLLECTION = "twap";

// Interface for staking summary
interface StakingSummary {
  id: string;
  totalStaked: string;
  activeStakes: string;
  noLockupAmount: string;
  oneMonthLockupAmount: string;
  threeMonthLockupAmount: string;
  sixMonthLockupAmount: string;
  twelveMonthLockupAmount: string;
  lastUpdated: string;
}

// GraphQL query to get a user's staking summary
const STAKING_SUMMARY_QUERY = gql`
  query GetStakingSummary($id: ID!) {
    stakingSummary(id: $id) {
      id
      totalStaked
      activeStakes
      noLockupAmount
      oneMonthLockupAmount
      threeMonthLockupAmount
      sixMonthLockupAmount
      twelveMonthLockupAmount
      lastUpdated
    }
  }
`;

function createSubgraphClient() {
  return new ApolloClient({
    link: new HttpLink({ uri: SUBGRAPH_URL, fetch }),
    cache: new InMemoryCache(),
    defaultOptions: {
      query: {
        fetchPolicy: "no-cache",
      },
    },
  });
}

// Calculate credits based on staking summary
function calculateCreditsFromSummary(summary: StakingSummary, tokenPrice: number): number {
  // Calculate USD values for each lockup period
  const noLockupValue = Number(formatEther(BigInt(summary.noLockupAmount))) * tokenPrice;
  const oneMonthValue = Number(formatEther(BigInt(summary.oneMonthLockupAmount))) * tokenPrice;
  const threeMonthValue = Number(formatEther(BigInt(summary.threeMonthLockupAmount))) * tokenPrice;
  const sixMonthValue = Number(formatEther(BigInt(summary.sixMonthLockupAmount))) * tokenPrice;
  const twelveMonthValue = Number(formatEther(BigInt(summary.twelveMonthLockupAmount))) * tokenPrice;

  // Calculate values with multipliers applied (multipliers are applied before tiering)
  const noLockupWithMultiplier = noLockupValue * 1;
  const oneMonthWithMultiplier = oneMonthValue * 1.25;
  const threeMonthWithMultiplier = threeMonthValue * 1.5;
  const sixMonthWithMultiplier = sixMonthValue * 2;
  const twelveMonthWithMultiplier = twelveMonthValue * 3;

  // Sum all values with their multipliers
  const totalValueWithMultipliers =
    noLockupWithMultiplier +
    oneMonthWithMultiplier +
    threeMonthWithMultiplier +
    sixMonthWithMultiplier +
    twelveMonthWithMultiplier;

  // Apply tiered credit calculation to the total
  let stakingCredits = 0;

  // First tier: 0.5 credits per dollar for first $20
  if (totalValueWithMultipliers > 0) {
    stakingCredits += Math.min(TIER1_MAX, totalValueWithMultipliers) * TIER1_RATE;
  }

  // Second tier: 0.25 credits per dollar for $21-$100
  if (totalValueWithMultipliers > TIER1_MAX) {
    stakingCredits += Math.min(TIER2_MAX - TIER1_MAX, totalValueWithMultipliers - TIER1_MAX) * TIER2_RATE;
  }

  // Third tier: 0.1 credits per dollar for $101+
  if (totalValueWithMultipliers > TIER2_MAX) {
    stakingCredits += (totalValueWithMultipliers - TIER2_MAX) * TIER3_RATE;
  }

  // Apply maximum cap
  stakingCredits = Math.min(stakingCredits, MAX_STAKING_CREDITS);

  return stakingCredits;
}

async function connectToMongo(): Promise<Db> {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  return client.db(DATABASE_NAME);
}

async function fetchTwapPrice(db: Db): Promise<number> {
  const twapCollection = db.collection(TWAP_COLLECTION);
  const twapData = await twapCollection.findOne({ period: "30 day" });
  if (!twapData || !twapData.price) {
    console.warn("30-day TWAP not found in DB. Falling back to 0.01.");
    return 0.01;
  }
  return twapData.price;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { address } = req.body;
  if (!address || typeof address !== "string") {
    return res.status(400).json({ message: "Address is required" });
  }
  const userAddress = address.toLowerCase();

  await new Promise(resolve => setTimeout(resolve, 10000));

  try {
    const db = await connectToMongo();
    const twapPrice = await fetchTwapPrice(db);

    const subgraphClient = createSubgraphClient();
    const { data } = await subgraphClient.query({
      query: STAKING_SUMMARY_QUERY,
      variables: { id: userAddress },
    });
    const summary: StakingSummary | null = data.stakingSummary;

    const creditsCollection = db.collection(CREDITS_COLLECTION);
    const existingUser = await creditsCollection.findOne({ address: userAddress });

    const creditsPurchased = existingUser?.creditsPurchased || 0;
    const creditsUsed = existingUser?.creditsUsed || 0;

    let stakingCredits = 0;
    if (summary) {
      stakingCredits = calculateCreditsFromSummary(summary, twapPrice);
      stakingCredits = Math.round(stakingCredits * 100) / 100;
    }

    const totalCredits = FREE_TIER_CREDITS + stakingCredits + creditsPurchased;
    const creditsRemaining = totalCredits - creditsUsed;

    await creditsCollection.updateOne(
      { address: userAddress },
      {
        $set: {
          address: userAddress,
          totalCredits,
          freeCredits: FREE_TIER_CREDITS,
          stakingCredits,
          creditsPurchased,
          creditsRemaining: Math.max(0, creditsRemaining),
        },
      },
      { upsert: true },
    );

    res.status(200).json({ message: "Credits updated successfully", totalCredits, creditsRemaining });
  } catch (error) {
    console.error(`Error recalculating credits for ${userAddress}:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
} 