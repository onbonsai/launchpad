import { createNodeRedisClient } from "handy-redis";

const { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } = process.env;

const client = createNodeRedisClient(`redis://default:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}`);

export default client;
