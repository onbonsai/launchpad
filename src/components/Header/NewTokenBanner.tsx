import React, { useState, useEffect, useRef } from 'react';
import Link from "next/link";
import { decodeEventLog, PublicClient, getAddress, decodeAbiParameters } from "viem";
import { groupBy } from "lodash/collection";
import { publicClient } from "@src/services/madfi/moneyClubs";
import BonsaiLaunchpadAbi from "@src/services/madfi/abi/BonsaiLaunchpad.json";
import { LAUNCHPAD_CONTRACT_ADDRESS } from "@src/services/madfi/utils";
import { getHandlesByAddresses } from "@src/services/lens/getProfiles";
import { shortAddress } from "@src/utils/utils";
import useIsMounted from "@src/hooks/useIsMounted";

interface NewTokenBannerProps {
  handle: string;
  clubId: string;
  symbol: string;
}

type RegisteredClubEvent = {
  event: {
    clubId: bigint;
    creator: `0x${string}`;
    initialSupply: bigint;
  }
  transactionHash: `0x${string}`
};

export const NewTokenBanner = () => {
  const isMounted = useIsMounted();
  // const [lastToken, setLastToken] = useState<TradeBannerProps>({
  //   handle: "carlosbeltran",
  //   clubId: "1",
  //   symbol: "ASCEND"
  // });
  const [lastToken, setLastToken] = useState<NewTokenBannerProps>();
  const [displayToken, setDisplayToken] = useState(lastToken);
  const isAnimatingRef = useRef(false);
  const tokenQueueRef = useRef<Array<typeof lastToken>>([]);
  const [key, setKey] = useState(0);

  useEffect(() => {
    tokenQueueRef.current.push(lastToken);
    if (!isAnimatingRef.current) {
      displayNextToken();
    }
  }, [lastToken]);

  const displayNextToken = () => {
    if (tokenQueueRef.current.length > 0) {
      setDisplayToken(tokenQueueRef.current.shift()!); // Remove the first trade from the queue and display it
      setKey(prevKey => prevKey + 1);
      isAnimatingRef.current = true;
      setTimeout(() => {
        isAnimatingRef.current = false;
        if (tokenQueueRef.current.length > 0) {
          displayNextToken(); // If there are more trades in the queue, display the next one
        }
      }, 1000); // Ensures the banner is displayed for at least 1 second
    }
  };

  useEffect(() => {
    if (isMounted) initListenForClubTrades();
  }, [isMounted]);

  const getNewClubInfo = async (client: PublicClient, clubIds: bigint[]) => {
    return await Promise.all(clubIds.map(async (clubId) => {
      const [_, __, ___, ____, _____, ______, tokenInfo] = await client.readContract({
        abi: BonsaiLaunchpadAbi,
        address: LAUNCHPAD_CONTRACT_ADDRESS,
        functionName: "registeredClubs",
        args: [clubId]
      }) as unknown[];
      const [n,symbol,i] = decodeAbiParameters([
        { name: 'name', type: 'string' }, { name: 'symbol', type: 'string' }, { name: 'uri', type: 'string' }
      ], tokenInfo as `0x${string}`);

      return { clubId, symbol };
    }));
  }

  const preplastToken = async (client: PublicClient, events: RegisteredClubEvent[]) => {
    const [tokens, profiles] = await Promise.all([
      getNewClubInfo(client, events.map(({ event: { clubId } }) => clubId)),
      getHandlesByAddresses(events.map(({ event: { creator } }) => creator))
    ]);
    const profilesGrouped = groupBy(profiles, 'ownedBy.address');
    const tokensGrouped = groupBy(tokens, 'clubId');
    events.forEach(async ({ event }) => {
      const address = getAddress(event.creator);
      const profile = profilesGrouped[address] ? profilesGrouped[address][0] : undefined;
      let ens;
      if (!profile) ens = await client.getEnsName({ address });

      setLastToken({
        handle: profile?.handle?.localName || ens || shortAddress(event.creator),
        clubId: event.clubId.toString(),
        symbol: tokensGrouped[event.clubId.toString()][0].symbol
      });
    })
  };

  const initListenForClubTrades = async () => {
    const client = publicClient();
    client.watchContractEvent({
      address: LAUNCHPAD_CONTRACT_ADDRESS,
      abi: BonsaiLaunchpadAbi,
      eventName: "RegisteredClub",
      onLogs: (logs: any[]) => {
        const events = logs
          .map((l) => {
            try {
              const event = decodeEventLog({ abi: BonsaiLaunchpadAbi, data: l.data, topics: l.topics });
              return { event: event.args, transactionHash: l.transactionHash };
            } catch { }
          }).filter((d) => d);

        preplastToken(client as PublicClient, events as unknown as RegisteredClubEvent[]);
      }
    });
  }

  if (!displayToken) return null;

  return (
    <Link key={key} href={`/token/${displayToken.clubId}`}>
      <div className="trade-banner py-2 px-4 rounded-lg cursor-pointer pulse-gradient">
        {`${displayToken.handle} created $${displayToken.symbol}`}
      </div>
    </Link>
  );
};