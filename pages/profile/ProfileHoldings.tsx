import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { useGetHoldings } from "@src/hooks/useMoneyClubs";
import { calculatePriceDelta } from "@src/services/madfi/moneyClubs";
import { Subtitle, Header, BodySemiBold } from "@src/styles/text";
import queryFiatViaLIFI from "@src/utils/tokenPriceHelper";
import { roundedToFixed } from "@src/utils/utils";
import { useEffect, useMemo, useState } from "react";
import { useInView } from "react-intersection-observer";
import { decodeAbiParameters, formatEther } from "viem";
import ProfileTokenRow from "./ProfileTokenRow";
import BonsaiNFT from "@pagesComponents/Dashboard/BonsaiNFT";

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
            const _holdings = holdings.map((h) => {
                const [name, symbol, image] = decodeAbiParameters([
                    { name: 'name', type: 'string' }, { name: 'symbol', type: 'string' }, { name: 'uri', type: 'string' }
                ], h.club.tokenInfo);
                let priceDelta;
                if (h.club.prevTrade24Hr?.length) {
                    priceDelta = calculatePriceDelta(h.club.currentPrice, h.club.prevTrade24Hr[0].price);
                }
                return { ...h, token: { name, symbol, image }, priceDelta };
            })
            console.log(_holdings);
            setAllHoldings([...allHoldings || [], ..._holdings]);
        }
    }, [isLoading]);

    useMemo(() => {
        if (!bonsaiAmount || bonsaiAmount === BigInt(0)) {
            setBonsaiPrice(0);
            return;
        }
        const tokenPrice = queryFiatViaLIFI(8453, "0x474f4cb764df9da079D94052fED39625c147C12C");
        const bonsaiHoldings = Number.parseFloat(formatEther(bonsaiAmount));
        const tokenHoldings = tokenPrice * bonsaiHoldings;
        setBonsaiPrice(tokenHoldings);
    }, [bonsaiAmount]);

    const totalBalance = useMemo(() => {
        if (!allHoldings) return;
        return allHoldings!.reduce((total, holding) => total + holding.balance, bonsaiPrice || 0);
    }, [bonsaiPrice, allHoldings]);

    if (isLoading && allHoldings === undefined) {
        return (
            <div ref={ref} className="flex justify-center pt-4">
                <Spinner customClasses="h-6 w-6" color="#E42101" />
            </div>
        )
    }

    return (
        <div className={`z-20 bg-card flex h-full w-full flex-col justify-between transition-transform bg-cardBackground duration-300 rounded-3xl relative min-h-full flex-grow p-4`}>
            <div>
                <Subtitle className="mb-2">
                    Balance
                </Subtitle>
                <Header>
                    ${!!totalBalance ? roundedToFixed(totalBalance, 2) : '-'}
                </Header>
                <div className="flex flex-col mt-7 mb-3">
                    <Subtitle className="mb-3">
                        Tokens
                    </Subtitle>
                    <div className='flex space-x-1 w-full h-full overflow-y-auto scrollbar-hide'>
                        {(allHoldings ?? []).map((holding) => <ProfileTokenRow holding={holding} canSell={isProfileAdmin}/>)}
                    </div>
                </div>
            </div>
            <div className="flex flex-col gap-3">
                <Subtitle className="mb-3">
                    Bonsai NFTs
                </Subtitle>
                {nfts.length === 0 && <BodySemiBold className="text-white"> No NFTs yet </BodySemiBold>}
                <div className='flex space-x-1 w-full min-h-[123px] overflow-x-auto scrollbar-hide'>
                    {nfts.map((tree, index) => (
                        <div className="flex flex-col items-center p-4 rounded-[20px]" key={`bonsai-nft-wrapper-${index}`}>
                            <BonsaiNFT tree={tree} index={index} size={'91px'} key={`bonsai-nft-${index}`} />
                            <Subtitle className="mt-1 text-white">
                                {/* TODO: Get the real number */}
                                #{tree.number}
                            </Subtitle>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default ProfileHoldings;