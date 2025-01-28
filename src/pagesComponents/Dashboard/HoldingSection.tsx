import React from 'react'
import HoldingsHeader from './HoldingsHeader'
import { kFormatter, roundedToFixed } from '@src/utils/utils';
import { formatUnits, formatEther } from 'viem';
import { DECIMALS, USDC_DECIMALS } from '@src/services/madfi/moneyClubs';
import TokenCard from './TokenCard';
import { SmallSubtitle, Subtitle } from '@src/styles/text';

interface HoldingSectionProps {
  holdings: any[];
  bonsaiAmount: bigint;
  bonsaiPriceString: string;
}

const HoldingSection = (props: HoldingSectionProps) => {
  const { holdings, bonsaiAmount, bonsaiPriceString } = props;
  return (
    <div className="flex flex-col rounded-sm border-zinc-700 gap-y-2 mt-8 overflow-hidden">
      {/* <HoldingsHeader title="Tokens" count={holdings.length + (bonsaiAmount > 0 ? 1 : 0)} /> */}
      <HoldingsHeader title="Tokens" count={holdings.length} />
      <div className='flex space-x-1 w-full overflow-x-auto mt-2 scrollbar-hide'>
        {/* {bonsaiAmount > 0 && <TokenCard
          key={`bonsai-row}`}
          title={'Bonsai'}
          count={roundedToFixed(parseFloat(formatEther(bonsaiAmount)), 2)}
          logo={<img src='/static/images/logo.svg' alt='token-image' className='h-4' />}
          symbol={'BONSAI'}
          logoBg={false}
          price={bonsaiPriceString}
        />} */}
        {holdings.map((row) => (
          <TokenCard
            clubId={row.club.clubId}
            v2={row.club.v2}
            key={`row-${row.club.clubId}`}
            title={row.token.name}
            count={
              !row.complete
                ? roundedToFixed(parseFloat(row.amount), 2)
                : kFormatter(parseFloat(row.amount))
            }
            logo={<img src={row.token.image || row.token.uri} alt='token-image' className='h-4' />}
            symbol={row.token.symbol}
            logoBg={true}
            price={roundedToFixed(row.balance, 2)}
          />
        ))}
        {holdings.length === 0 && bonsaiAmount === 0n && (
          <div className='flex justify-center items-center w-full h-[82px] min-w-[160px] bg-white/5 rounded-2xl'>
            <SmallSubtitle>
              No tokens yet, go buy some!
            </SmallSubtitle>
          </div>
        )}
      </div>
    </div>
  )
}

export default HoldingSection