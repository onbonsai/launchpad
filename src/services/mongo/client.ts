import { MongoClient } from "mongodb";

import {
  MONGO_COLLECTION_BIDS,
  MONGO_COLLECTION_BOUNTIES,
  MONGO_COLLECTION_PROMOTED,
  MONGO_DB_CREATORS,
} from "@src/constants/constants";

import { IS_PRODUCTION } from "@src/services/madfi/utils";

const uri = process.env.MONGO_URI;

let mongoClient: MongoClient;
const databases = {};

if (!uri) {
  throw new Error("Please add your Mongo URI to .env/.env.local");
}

const connectToDatabase = async (databaseName: string) => {
  let database = databases[databaseName];
  try {
    if (mongoClient && database) {
      return { mongoClient, database };
    }
    if (!IS_PRODUCTION) {
      if (!global._mongoClient) {
        mongoClient = await new MongoClient(uri).connect();
        global._mongoClient = mongoClient;
      } else {
        mongoClient = global._mongoClient;
      }
    } else {
      mongoClient = await new MongoClient(uri).connect();
    }
    database = await mongoClient.db(databaseName);
    databases[databaseName] = database;
    return { mongoClient, database };
  } catch (e) {
    console.error(e);
  }
};

export const getClientWithBids = async () => {
  // @ts-ignore
  const { database } = await connectToDatabase(MONGO_DB_CREATORS);
  const collection = database.collection(MONGO_COLLECTION_BIDS);

  return { collection, database };
};

export const getClientWithBounties = async () => {
  // @ts-ignore
  const { database } = await connectToDatabase(MONGO_DB_CREATORS);
  const collection = database.collection(MONGO_COLLECTION_BOUNTIES);

  return { collection, database };
};

export const getClientWithPromoted = async () => {
  // @ts-ignore
  const { database } = await connectToDatabase(MONGO_DB_CREATORS);
  const collection = database.collection(MONGO_COLLECTION_PROMOTED);

  return { collection };
};

export const getClientWithBidsBounties = async () => {
  // @ts-ignore
  const { database } = await connectToDatabase(MONGO_DB_CREATORS);
  const bidCollection = database.collection(MONGO_COLLECTION_BIDS);
  const bountyCollection = database.collection(MONGO_COLLECTION_BOUNTIES);

  return { bidCollection, bountyCollection, database };
};

export const getClientWithLeaderboard = async () => {
  // @ts-ignore
  const { database } = await connectToDatabase("analytics");
  const collection = database.collection("leaderboard");

  return { collection, database };
};

export const getClientWithTwitter = async () => {
  // @ts-ignore
  const { database } = await connectToDatabase("creators");
  const collection = database.collection("twitter-auth-tokens");

  return { collection, database };
};

export const getClientWithCreatorInfo = async () => {
  // @ts-ignore
  const { database } = await connectToDatabase("creators");
  const collection = database.collection("creator-info");

  return { collection, database };
};

export const getClientWithCreditsGhostwriter = async () => {
  // @ts-ignore
  const { database } = await connectToDatabase("credits");
  const collection = database.collection("ghostwriter");

  return { collection, database };
};

export const getClientWithClubs = async () => {
  // @ts-ignore
  const { database } = await connectToDatabase("moonshot");
  const _collection = IS_PRODUCTION ? "clubs-prod" : "clubs";
  const collection = database.collection(_collection);

  return { collection, database };
};

export const getClientWithHookSubmissions = async () => {
  // @ts-ignore
  const { database } = await connectToDatabase("moonshot");
  const collection = database.collection("hook-submissions");

  return { collection, database };
};

export const getClientWithApiCredits = async () => {
  // @ts-ignore
  const { database } = await connectToDatabase("client-bonsai");
  const collection = database.collection("api-credits");

  return { collection, database };
};

export const getClientWithTwap = async () => {
  // @ts-ignore
  const { database } = await connectToDatabase("client-bonsai");
  const collection = database.collection("twap");

  return { collection, database };
};

export const getClientWithStakingReferrals = async () => {
  // @ts-ignore
  const { database } = await connectToDatabase("client-bonsai");
  const collection = database.collection("staking-referrals");

  return { collection, database };
};


export const getClientWithBonsaiClaim = async (__client?: any) => {
  // @ts-ignore
  const { database } = await connectToDatabase("moonshot");
  const collection = database.collection("lc-bonsai-claim-1");

  return { collection, database };
};
