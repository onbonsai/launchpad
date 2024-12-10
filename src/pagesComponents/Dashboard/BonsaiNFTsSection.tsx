import React from 'react'
import HoldingsHeader from './HoldingsHeader'
import { kFormatter, roundedToFixed } from '@src/utils/utils';
import { formatUnits } from 'viem';
import { DECIMALS } from '@src/services/madfi/moneyClubs';
import TokenCard from './TokenCard';
import { SmallSubtitle, Subtitle } from '@src/styles/text';

interface BonsaiNFTsSectionProps {
  nfts?: any[];
}

const BonsaiNFTsSection = (props: BonsaiNFTsSectionProps) => {
  const { nfts } = props;
  console.log(nfts);
  return (
    <div className="flex flex-col rounded-sm border-zinc-700 gap-y-2 mt-8 overflow-hidden">
      <HoldingsHeader title="Bonsai NFTs" count={nfts?.length || 0} />
      {!!nfts?.length
        ? <div className='flex space-x-1 w-full overflow-x-auto mt-3 scrollbar-hide'>
          hey
        </div>
        : <div className='flex border-spacing-3 border mt-3 border-dashed border-card-lightest justify-center items-center w-full h-[82px] bg-white/5 rounded-2xl'>
          <SmallSubtitle>
            Add the real design here!
          </SmallSubtitle>
        </div>}
    </div>
  );
}

export default BonsaiNFTsSection