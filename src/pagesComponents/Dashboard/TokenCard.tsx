import Link from "next/link";
import type { ReactNode } from 'react'
import { V1_LAUNCHPAD_URL } from "@src/services/madfi/moneyClubs";

interface TokenCardProps {
    title: string;
    count: string | number;
    logo: ReactNode;
    symbol: string;
    logoBg?: boolean;
    price: string;
    clubId: string;
    v2: boolean;
    chain: string;
    tokenAddress: string | undefined;
}


const TokenCard = (props: TokenCardProps) => {
    const { title, count, logo, symbol, logoBg, price, clubId, v2, chain, tokenAddress } = props;
    const link = v2
        ? `/token/${chain}/${tokenAddress!}`
        : `${V1_LAUNCHPAD_URL}/token/${clubId}`;
    return (
        <Link href={link} legacyBehavior target="_blank" >
            <div className='flex flex-col items-start justify-start text-white bg-white/5 h-[100px] min-w-[160px] py-2 px-3 rounded-2xl cursor-pointer hover:opacity-90'>
                <div className='flex justify-between items-center w-full'>
                    <p className='text-[16px] leading-tight font-semibold truncate max-w-[70%]'>{title}</p>
                    <span className={`${logoBg ? 'bg-white' : ''} rounded-full flex items-center justify-center h-8 w-8`}>
                        {logo}
                    </span>
                </div>
                <div className='flex space-x-2 text-[14px] leading-[1.2] text-white/70 font-medium mt-[2px] ml-0 mb-2 overflow-hidden text-ellipsis whitespace-nowrap'>
                    <p>{count}</p>
                    <span className="truncate break-words max-w-[100px]">{symbol}</span>
                </div>
                <p className='text-[14px] leading-[1.2]'>
                    ${price}
                </p>
            </div>
        </Link>
    )
}

export default TokenCard