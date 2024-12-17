import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { decodeEventLog, PublicClient, getAddress, decodeAbiParameters } from "viem";
import { groupBy } from "lodash/collection";
import { Ticker } from "@src/components/Ticker";
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

const testItems = [
  {
      "handle": "carlosbeltran",
      "verb": "created",
      "clubId": "3",
      "symbol": "SAGE",
      "image": "https://www.storj-ipfs.com/ipfs/bafybeihcdn4b2d7bg3razrigperej4gj2nqd3grc3m4ty5jb2aezbk26xa",
      "transactionHash": "0xe06bc0cd5f17f83b6abb710b015fcc0673e6f151ba941f2161aaca0465e427f3"
  },
  {
      "handle": "carlosbeltran",
      "verb": "created",
      "clubId": "3",
      "symbol": "SAGE",
      "image": "https://www.storj-ipfs.com/ipfs/bafybeihcdn4b2d7bg3razrigperej4gj2nqd3grc3m4ty5jb2aezbk26xa",
      "transactionHash": "0xe06bc0cd5f17f83b6abb710b015fcc0673e6f151ba941f2161aaca0465e427f3"
  },
  {
      "handle": "carlosbeltran",
      "verb": "created",
      "clubId": "3",
      "symbol": "SAGE",
      "image": "https://www.storj-ipfs.com/ipfs/bafybeihcdn4b2d7bg3razrigperej4gj2nqd3grc3m4ty5jb2aezbk26xa",
      "transactionHash": "0xe06bc0cd5f17f83b6abb710b015fcc0673e6f151ba941f2161aaca0465e427f3"
  }
]

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
    const _items = await Promise.all(events.map(async ({ event }) => {
      const address = getAddress(event.actor);
      const profile = profilesGrouped[address] ? profilesGrouped[address][0] : undefined;
      let ens;
      if (!profile) ens = await client.getEnsName({ address });

      return {
        handle: profile?.handle?.localName || ens || shortAddress(event.actor),
        verb: event.isBuy ? 'bought' : 'sold',
        // price: roundedToFixed(parseFloat(formatUnits(event.price || 0n, USDC_DECIMALS)), 2),
        clubId: event.clubId.toString(),
        symbol: tokensGrouped[event.clubId.toString()][0].symbol,
        image: tokensGrouped[event.clubId.toString()][0].image
      };
    }));

    setItems([...items, ..._items]);
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
    const _items = await Promise.all(events.map(async ({ event, transactionHash }) => {
      const address = getAddress(event.creator);
      const profile = profilesGrouped[address] ? profilesGrouped[address][0] : undefined;
      let ens;
      if (!profile) ens = await client.getEnsName({ address });

      return {
        handle: profile?.handle?.localName || ens || shortAddress(event.creator),
        verb: 'created',
        clubId: event.clubId.toString(),
        symbol: tokensGrouped[event.clubId.toString()][0].symbol,
        image: tokensGrouped[event.clubId.toString()][0].image,
      };
    }));

    setItems([...items, ..._items]);
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
      <Ticker slideSpeed={"30s"}>
        {/* testItems.map() */}
        {items?.map((item, index) => (
          <React.Fragment key={`fragment-${index}`}>
            <Link key={`-${index}`} href={`/token/${item.clubId}`}>
              <div className="text-base leading-5 font-medium testStyle flex justify-center items-center h-10 min-w-[120px] cursor-pointer gap-x-2 mr-2">
                <span className="flex flex-row items-center bg-[var(--gradient-start)] bg-opacity-80 rounded-xl py-2 px-2">
                  {item.handle}
                </span>
                <span>{item.verb}</span>
                <span className="flex flex-row items-center gap-x-2 bg-[var(--gradient-start)] bg-opacity-80 rounded-xl pr-2 py-[1px]">
                  <img
                    src={item.image}
                    alt={item.symbol}
                    sizes="1vw"
                    className="w-[32px] h-[32px] object-cover rounded-xl"
                  />
                  ${item.symbol}
                </span>
              </div>
            </Link>
            {index < items.length - 1 && <span className="px-4 h-2 w-2 mt-2 color-[var(--gradient-start)] opacity-80">•</span>}
          </React.Fragment>
        ))}
      </Ticker>
    </div>
  );
};