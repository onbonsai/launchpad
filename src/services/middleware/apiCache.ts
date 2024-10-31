import { escape } from "lodash/string";
import { NextApiRequest, NextApiResponse } from "next";

import redis from "@src/utils/redisClient";

const key = (pathname: string, body: any) => `${pathname}?q=${escape(JSON.stringify(body))}`;

export const checkCache = async (path: string, req: NextApiRequest, res: NextApiResponse) => {
  return await redis.get(key(path, req.body));
};

export const cacheResult = async (path: string, req: NextApiRequest, result: any, exp = 60) => {
  await redis.set(
    key(path, req.body),
    JSON.stringify(result),
    "EX",
    exp, // seconds
  );
};

// for non-POST requests
export const checkCacheAlt = async (path: string, body: any) => {
  return await redis.get(key(path, body));
};

export const cacheResultAlt = async (path: string, body: any, result: any, exp = 60) => {
  await redis.set(
    key(path, body),
    JSON.stringify(result),
    "EX",
    exp, // seconds
  );
};
