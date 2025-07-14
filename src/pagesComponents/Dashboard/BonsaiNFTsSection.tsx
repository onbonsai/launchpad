import React, { useMemo, useState } from 'react'
import HoldingsHeader from './HoldingsHeader'
import { formatUnits } from 'viem';
import { DECIMALS } from '@src/services/madfi/moneyClubs';
import { SmallSubtitle, Subtitle } from '@src/styles/text';
import BonsaiNFT from './BonsaiNFT';

const amountRequiredForNFT = 100000;
interface BonsaiNFTsSectionProps {
  nfts?: any[];
  bonsaiAmount?: bigint;
}

const BonsaiNFTsSection = React.memo((props: BonsaiNFTsSectionProps) => {
  const { nfts, bonsaiAmount } = props;
  const [amountUntilNFT, setAmountUntilNFT] = useState<number>(0);
  useMemo(() => {
    if (bonsaiAmount) {
      const currentAmount = Number.parseFloat(formatUnits(bonsaiAmount, DECIMALS));
      setAmountUntilNFT(amountRequiredForNFT - currentAmount);
    } else {
      setAmountUntilNFT(amountRequiredForNFT);
    }
  }, [bonsaiAmount]);

  return (
    <div className="flex flex-col rounded-sm border-zinc-700 gap-y-2 mt-8 overflow-hidden">
      <HoldingsHeader title="Bonsai NFTs" count={nfts?.length || 0} />
      {(!!nfts && nfts.length > 0)
        ? <div className='flex space-x-2 w-full overflow-x-auto mt-2'>
          {nfts.map((tree, index) => (
            <BonsaiNFT tree={tree} index={index} key={`bonsai-nft-${index}`} tokenId={tree.tokenId} />
          ))}
        </div>
        : <div className='flex flex-col  border-spacing-3 border mt-3 border-dashed border-card-lightest justify-center items-center px-3 w-full h-[82px] bg-white/5 rounded-2xl'>
          <Subtitle>
            {amountUntilNFT.toLocaleString()} $BONSAI to enjoy 0% trading fees
          </Subtitle>
        </div>}
      <SmallSubtitle>
        100K $BONSAI = 1 BONSAI NFT
      </SmallSubtitle>
    </div>
  );
});

export default BonsaiNFTsSection