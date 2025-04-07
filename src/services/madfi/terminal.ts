import { Account } from "@lens-protocol/client";
import { getProfileByHandle } from "../lens/getProfiles";
import { useQuery, UseQueryResult } from "@tanstack/react-query";

export const TERMINAL_API_URL = process.env.NEXT_PUBLIC_ELIZA_TERMINAL_API_URL || "https://eliza-staging-terminal.onbons.ai"; // client-bonsai-terminal
export const GLOBAL_AGENT_ID = "c3bd776c-4465-037f-9c7a-bf94dfba78d9"; // Sage

export interface AgentInfo {
  info: { wallets: `0x${string}`[] };
  account?: Account,
  agentId: string;
};

export const getAgentInfo = async (agentId: string): Promise<AgentInfo | undefined> => {
  try {
    const response = await fetch(`${TERMINAL_API_URL}/agent/${agentId}/info`, { cache: 'no-cache' });
    const info = await response.json();

    let account;
    console.log(info.account.username);
    if (!!info.account?.username) {
      account = await getProfileByHandle(info.account.username);
    }

    return {
      info,
      account,
      agentId: GLOBAL_AGENT_ID,
    };
  } catch (error) {
    console.error('Failed to fetch agent info:', error);
  }
};

export const useGetAgentInfo = (agentId?: string): UseQueryResult<AgentInfo, Error> => {
  return useQuery({
    queryKey: ["agent-info", agentId || GLOBAL_AGENT_ID],
    queryFn: () => getAgentInfo(agentId || GLOBAL_AGENT_ID),
  });
};