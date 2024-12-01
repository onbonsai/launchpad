import React, { useState, useEffect, useRef } from 'react';
import Link from "next/link";
import { decodeEventLog, PublicClient, getAddress, formatUnits } from "viem";
import { groupBy } from "lodash/collection";
import { DECIMALS, publicClient, getRegisteredClubInfo, USDC_DECIMALS } from "@src/services/madfi/moneyClubs";
import BonsaiLaunchpadAbi from "@src/services/madfi/abi/BonsaiLaunchpad.json";
import { LAUNCHPAD_CONTRACT_ADDRESS } from "@src/services/madfi/utils";
import { getHandlesByAddresses } from "@src/services/lens/getProfiles";
import { shortAddress, roundedToFixed } from "@src/utils/utils";
import { bToHexString } from "@src/services/lens/utils";
import useIsMounted from "@src/hooks/useIsMounted";

interface TradeBannerProps {
  handle: string;
  verb: string;
  price: string;
  clubId: string;
  symbol: string;
}

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

export const TradeBanner = () => {
  const isMounted = useIsMounted();
  // const [lastTrade, setLastTrade] = useState<TradeBannerProps>({
  //   handle: "carlosbeltran",
  //   verb: "bought",
  //   amount: "1",
  //   clubId: "1",
  //   symbol: "ASCEND"
  // });
  const [lastTrade, setLastTrade] = useState<TradeBannerProps>();
  const [displayTrade, setDisplayTrade] = useState(lastTrade);
  const isAnimatingRef = useRef(false);
  const tradeQueueRef = useRef<Array<typeof lastTrade>>([]);
  const [key, setKey] = useState(0);

  useEffect(() => {
    tradeQueueRef.current.push(lastTrade);
    if (!isAnimatingRef.current) {
      displayNextTrade();
    }
  }, [lastTrade]);

  const displayNextTrade = () => {
    if (tradeQueueRef.current.length > 0) {
      setDisplayTrade(tradeQueueRef.current.shift()!); // Remove the first trade from the queue and display it
      setKey(prevKey => prevKey + 1);
      isAnimatingRef.current = true;
      setTimeout(() => {
        isAnimatingRef.current = false;
        if (tradeQueueRef.current.length > 0) {
          displayNextTrade(); // If there are more trades in the queue, display the next one
        }
      }, 1000); // Ensures the banner is displayed for at least 1 second
    }
  };

  useEffect(() => {
    if (isMounted) initListenForClubTrades();
  }, [isMounted]);

  const prepLastTrade = async (client: PublicClient, events: TradeEvent[]) => {
    const [tokens, profiles] = await Promise.all([
      getRegisteredClubInfo(events.map(({ event: { clubId } }) => bToHexString(clubId))),
      getHandlesByAddresses(events.map(({ event: { actor } }) => actor))
    ]);
    const profilesGrouped = groupBy(profiles, 'ownedBy.address');
    const tokensGrouped = groupBy(tokens, 'clubId');
    events.forEach(async ({ event }) => {
      const address = getAddress(event.actor);
      const profile = profilesGrouped[address] ? profilesGrouped[address][0] : undefined;
      let ens;
      if (!profile) ens = await client.getEnsName({ address });

      setLastTrade({
        handle: profile?.handle?.localName || ens || shortAddress(event.actor),
        verb: event.isBuy ? 'bought' : 'sold',
        price: roundedToFixed(parseFloat(formatUnits(event.price || 0n, USDC_DECIMALS)), 2),
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

  if (!displayTrade) return null;

  return (
    <Link key={key} href={`/token/${displayTrade.clubId}`}>
      <div className={`trade-banner py-2 px-4 rounded-lg cursor-pointer ${displayTrade.verb === 'bought' ? 'pulse-green' : 'pulse-red'}`}>
        {`${displayTrade.handle} ${displayTrade.verb} $${displayTrade.price} of $${displayTrade.symbol}`}
      </div>
    </Link>
  );
};