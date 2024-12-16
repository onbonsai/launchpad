import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { decodeEventLog, PublicClient, getAddress, decodeAbiParameters } from "viem";
import { groupBy } from "lodash/collection";
import { HorizontalTicker } from "react-infinite-ticker";
import { publicClient, getRegisteredClubInfo } from "@src/services/madfi/moneyClubs";
import BonsaiLaunchpadAbi from "@src/services/madfi/abi/BonsaiLaunchpad.json";
import { LAUNCHPAD_CONTRACT_ADDRESS } from "@src/services/madfi/utils";
import { getHandlesByAddresses } from "@src/services/lens/getProfiles";
import { shortAddress } from "@src/utils/utils";
import { bToHexString } from "@src/services/lens/utils";
import useIsMounted from "@src/hooks/useIsMounted";

interface BannerItemProps {
  handle: string;
  verb: string;
  clubId: string;
  symbol: string;
  image: string;
}

type RegisteredClubEvent = {
  event: {
    clubId: bigint;
    creator: `0x${string}`;
    initialSupply: bigint;
  }
  transactionHash: `0x${string}`
};

type TradeEvent = {
  event: {
    clubId: bigint;
    amount: bigint;
    isBuy: boolean;
    actor: `0x${string}`;
    price: bigint;
    priceAfterProtocolFee: bigint;
    complete: boolean;
    creatorFee: bigint;
  }
  transactionHash: `0x${string}`
};

export const ActivityBanner = () => {
  const isMounted = useIsMounted();
  // const [, setItems] = useState<BannerItemProps>({
  //   handle: "carlosbeltran",
  //   verb: "bought",
  //   amount: "1",
  //   clubId: "1",
  //   symbol: "ASCEND"
  // });
  const [items, setItems] = useState<BannerItemProps[]>([]);
  const [clubCache, setClubCache] = useState({});

  useEffect(() => {
    if (isMounted) {
      initListenForClubTrades();
      initListenForRegisteredClubs();
    }
  }, [isMounted]);

  const getClubInfo = async (clubIds: string[]) => {
    const nonCached = clubIds.filter((clubId) => !clubCache[clubId]);
    const tokens = await getRegisteredClubInfo(nonCached);
    tokens.forEach((token) => clubCache[token.id] = token);
    const cached = clubIds.map((clubId) => clubCache[clubId]).filter((c) => c);

    return [...tokens, ...cached];
  }

  const prepLastTrade = async (client: PublicClient, events: TradeEvent[]) => {
    const [tokens, profiles] = await Promise.all([
      getClubInfo(events.map(({ event: { clubId } }) => bToHexString(clubId))),
      getHandlesByAddresses(events.map(({ event: { actor } }) => actor))
    ]);
    const profilesGrouped = groupBy(profiles, 'ownedBy.address');
    const tokensGrouped = groupBy(tokens, 'clubId');
    events.forEach(async ({ event }) => {
      const address = getAddress(event.actor);
      const profile = profilesGrouped[address] ? profilesGrouped[address][0] : undefined;
      let ens;
      if (!profile) ens = await client.getEnsName({ address });

      const t = {
        handle: profile?.handle?.localName || ens || shortAddress(event.actor),
        verb: event.isBuy ? 'bought' : 'sold',
        // price: roundedToFixed(parseFloat(formatUnits(event.price || 0n, USDC_DECIMALS)), 2),
        clubId: event.clubId.toString(),
        symbol: tokensGrouped[event.clubId.toString()][0].symbol,
        image: tokensGrouped[event.clubId.toString()][0].image
      };

      setItems([...items, t]);
    })
  };

  const initListenForClubTrades = async () => {
    const client = publicClient();
    client.watchContractEvent({
      address: LAUNCHPAD_CONTRACT_ADDRESS,
      abi: BonsaiLaunchpadAbi,
      eventName: "Trade",
      onLogs: (logs: any[]) => {
        const events = logs
          .map((l) => {
            try {
              const event = decodeEventLog({ abi: BonsaiLaunchpadAbi, data: l.data, topics: l.topics });
              return { event: event.args, transactionHash: l.transactionHash };
            } catch { }
          }).filter((d) => d);

        prepLastTrade(client as PublicClient, events as unknown as TradeEvent[]);
      }
    });
  }

  const getNewClubInfo = async (client: PublicClient, clubIds: bigint[]) => {
    return await Promise.all(clubIds.map(async (clubId) => {
      if (clubCache[clubId.toString()]) return clubCache[clubId.toString()];

      const [_, __, ___, ____, _____, ______, tokenInfo] = await client.readContract({
        abi: BonsaiLaunchpadAbi,
        address: LAUNCHPAD_CONTRACT_ADDRESS,
        functionName: "registeredClubs",
        args: [clubId]
      }) as unknown[];
      const [n,symbol,image] = decodeAbiParameters([
        { name: 'name', type: 'string' }, { name: 'symbol', type: 'string' }, { name: 'uri', type: 'string' }
      ], tokenInfo as `0x${string}`);

      setClubCache({
        ...clubCache,
        [clubId.toString()]: { clubId, symbol, image }
      });

      return { clubId, symbol, image };
    }));
  }

  const prepCreatedToken = async (client: PublicClient, events: RegisteredClubEvent[]) => {
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

      const t = {
        handle: profile?.handle?.localName || ens || shortAddress(event.creator),
        verb: 'created',
        clubId: event.clubId.toString(),
        symbol: tokensGrouped[event.clubId.toString()][0].symbol,
        image: tokensGrouped[event.clubId.toString()][0].image
      };

      setItems([...items, t]);
    })
  };

  const initListenForRegisteredClubs = async () => {
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

        prepCreatedToken(client as PublicClient, events as unknown as RegisteredClubEvent[]);
      }
    });
  }

  return (
    <div className="w-full h-[40px] text-black mb-10" style={{
      background: "linear-gradient(90deg, var(--gradient-start) 0%, var(--gradient-end) 135.42%)"
    }}>
      <HorizontalTicker duration={40000}>
        {items?.map((item, index) => (
          <Link key={`-${index}`} href={`/token/${item.clubId}`}>
            <div className="text-base leading-5 font-medium testStyle flex justify-center items-center h-10 min-w-[120px] cursor-pointer">
              {`${item.handle} ${item.verb} $${item.symbol}`}
            </div>
          </Link>
        ))}
      </HorizontalTicker>
    </div>
  );
};