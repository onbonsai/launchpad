import Link from "next/link";
import type { ReactNode } from 'react'

interface TokenCardProps {
    title: string;
    count: string | number;
    logo: ReactNode;
    symbol: string;
    logoBg?: boolean;
    price: string;
    clubId: string;
}


const TokenCard = (props: TokenCardProps) => {
    const { title, count, logo, symbol, logoBg, price, clubId } = props;
    return (
        <Link href={`/token/${clubId}`} legacyBehavior target="_blank" >
            <div className='flex flex-col items-start justify-start text-white bg-white/5 h-[82px] min-w-[160px] py-2 px-3 rounded-2xl'>
                <div className='flex justify-between items-center w-full'>
                    <p className='text-[16px] leading-tight font-semibold'>{title}</p>
                    <span className={`${logoBg ? 'bg-white' : ''} rounded-full flex items-center justify-center h-4 w-4`}>
                        {logo}
                    </span>
                </div>
                <p className='text-[14px] leading-[1.2] text-white/70 font-medium mt-[2px] ml-0 mb-2'>
                    {count} {symbol}
                </p>
                <p className='text-[14px] leading-[1.2]'>
                    ${price}
                </p>
            </div>
        </Link>
    )
}

export default TokenCard