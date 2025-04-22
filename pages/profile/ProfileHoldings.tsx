import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { useGetHoldings } from "@src/hooks/useMoneyClubs";
import { calculatePriceDelta } from "@src/services/madfi/moneyClubs";
import { Subtitle, Header, BodySemiBold } from "@src/styles/text";
import queryFiatViaLIFI from "@src/utils/tokenPriceHelper";
import { roundedToFixed } from "@src/utils/utils";
import { useEffect, useMemo, useState } from "react";
import { useInView } from "react-intersection-observer";
import { decodeAbiParameters, formatEther, formatUnits } from "viem";
import ProfileTokenRow, { BuySellAction } from "./ProfileTokenRow";
import BonsaiNFT from "@pagesComponents/Dashboard/BonsaiNFT";
import BuySellModal from "@pagesComponents/Club/BuySellModal";

interface ProfileHoldingsProps {
  address: `0x${string}`;
  bonsaiAmount: bigint;
  nfts: any[];
  isProfileAdmin: boolean;
}

const ProfileHoldings = (props: ProfileHoldingsProps) => {
  const { address, bonsaiAmount, nfts, isProfileAdmin } = props;
  const { ref, inView } = useInView()
  const [page, setPage] = useState(0);
  const [allHoldings, setAllHoldings] = useState<any[]>();
  const [bonsaiPrice, setBonsaiPrice] = useState(0);
  const [activeBuySellAction, setActiveBuySellAction] = useState<BuySellAction | null>(null);
  const { data, isLoading, refetch } = useGetHoldings(address, page);
  const { holdings, hasMore } = data || {};

  useEffect(() => {
    if (inView && !isLoading && hasMore) {
      setPage(page + 1);
      refetch();
    }
  }, [inView]);

  useEffect(() => {
    if (!isLoading && holdings?.length) {
      try {
        const _holdings = holdings.filter(h => h?.club).map((h) => {
          if (!h.club?.tokenInfo && !h.club?.name) {
            console.warn('Missing tokenInfo for club:', h);
            return null;
          }

          try {
            let { name, symbol, uri: image } = h.club

            if (!h.club.name || !h.club.symbol || !h.club.uri){
              // backup for v1 clubs
              [name, symbol, image] = decodeAbiParameters([
                { name: 'name', type: 'string' }, { name: 'symbol', type: 'string' }, { name: 'uri', type: 'string' }
              ], h.club.tokenInfo);
            }

            let priceDelta;
            if (h.club?.prevTrade24Hr?.length) {
              priceDelta = calculatePriceDelta(h.club!.currentPrice, h.club!.prevTrade24Hr[0].price);
            }

            return { ...h, token: { name, symbol, image }, priceDelta };
          } catch (error) {
            console.error('Error decoding token info:', error);
            return null;
          }
        }).filter(Boolean); // Remove null entries

        setAllHoldings(prev => {
          const uniqueHoldings = new Map(
            [...(prev || []), ..._holdings].map(item => [item.id, item]) // Assuming each holding has a unique `id`
          );
          return Array.from(uniqueHoldings.values());
        });
      } catch (error) {
        console.error('Error processing holdings:', error);
      }
    } else if (!isLoading && holdings?.length === 0) {
      setAllHoldings([]);
    }
  }, [isLoading, holdings]);

  useMemo(() => {
    if (!bonsaiAmount || bonsaiAmount === BigInt(0)) {
      setBonsaiPrice(0);
      return;
    }
    const fetchPrice = async () => {
      const tokenPrice = await queryFiatViaLIFI(8453, "0x474f4cb764df9da079D94052fED39625c147C12C");
      const bonsaiHoldings = Number.parseFloat(formatEther(bonsaiAmount));
      const tokenHoldings = tokenPrice * bonsaiHoldings;
      setBonsaiPrice(tokenHoldings);
    }
    fetchPrice()
  }, [bonsaiAmount]);

  const totalBalance = useMemo(() => {
    if (!allHoldings) return;
    if (allHoldings.length === 0) return 0;
    return allHoldings!.reduce((total, holding) => total + holding.balance, 0);
  }, [bonsaiPrice, allHoldings]);

  if (isLoading && allHoldings === undefined) {
    return (
      <div ref={ref} className="flex justify-center pt-4">
        <Spinner customClasses="h-6 w-6" color="#5be39d" />
      </div>
    )
  }

  const onBuySellPressed = (action: BuySellAction) => {

  }

  return (
    <div className="z-20 bg-card flex h-full w-full flex-col justify-between rounded-3xl relative min-h-full flex-grow p-4 max-h-[87vh]">
      <div className="flex flex-col min-h-0 h-full">
        <Subtitle className="mb-2">Balance</Subtitle>
        <Header>${totalBalance != undefined ? roundedToFixed(totalBalance, 2) : '-'}</Header>

        <div className="flex flex-col mt-7 mb-3 min-h-0 flex-grow">
          <Subtitle className="mb-3">Tokens</Subtitle>
          <div className="flex flex-col w-full overflow-y-auto scrollbar-hide gap-1 min-h-0">
            {/* {bonsaiAmount > 0 && <ProfileTokenRow holding={{ amount: BigInt(parseFloat(formatUnits(bonsaiAmount, 12))), balance: bonsaiPrice, club: { prevTrade24Hr: [] }, token: { image: 'https://assets.coingecko.com/coins/images/35884/large/Bonsai_BW_Coingecko-200x200.jpg?1710071621', name: 'Bonsai', symbol: 'BONSAI' } }} canSell={isProfileAdmin} />} */}
            {(allHoldings ?? []).map((holding, i) => (
              <ProfileTokenRow key={i} holding={holding} canSell={isProfileAdmin} pressedBuySell={(a) => {
                setActiveBuySellAction(a);
              }
              } />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-4">
        <Subtitle className="mb-3">Bonsai NFTs</Subtitle>
        {!nfts || nfts?.length === 0 && <BodySemiBold className="text-white">No NFTs yet</BodySemiBold>}
        <div className="flex space-x-1 w-full min-h-[123px] overflow-x-auto scrollbar-hide">
          {(nfts ?? []).map((tree, index) => (
            <div className="flex flex-col items-center p-1 rounded-[20px] bg-card-light" key={`bonsai-nft-${index}`}>
              <BonsaiNFT tree={tree} index={index} size={'91px'} tokenId={tree.tokenId} />
              <Subtitle className="mt-1 text-white">#{tree.tokenId}</Subtitle>
            </div>
          ))}
        </div>
      </div>
      <BuySellModal
        club={activeBuySellAction ? activeBuySellAction!.club : null}
        address={address}
        open={!!activeBuySellAction}
        onClose={() => setActiveBuySellAction(null)}
      />
    </div>
  );
}

export default ProfileHoldings;