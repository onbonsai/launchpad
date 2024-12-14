import React, { useMemo, useState } from 'react'
import HoldingsHeader from './HoldingsHeader'
import { kFormatter, roundedToFixed } from '@src/utils/utils';
import { formatUnits } from 'viem';
import { DECIMALS } from '@src/services/madfi/moneyClubs';
import TokenCard from './TokenCard';
import { SmallSubtitle, Subtitle } from '@src/styles/text';
import { am } from '@lens-protocol/metadata/dist/index-eeb4b240';
import { Button } from '@src/components/Button';
import BonsaiNFT from './BonsaiNFT';

const amountRequiredForNFT = 100000;
interface BonsaiNFTsSectionProps {
  nfts?: any[];
  bonsaiAmount?: bigint;
  onBuyBonsai: () => void;
}

const BonsaiNFTsSection = (props: BonsaiNFTsSectionProps) => {
  const { nfts, bonsaiAmount, onBuyBonsai } = props;
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
        ? <div className='flex space-x-1 w-full overflow-x-auto mt-2 px-4'>
          {nfts.map((tree, index) => (
            <BonsaiNFT tree={tree} index={index} key={`bonsai-nft-${index}`} />
          ))}
        </div>
        : <div className='flex flex-col  border-spacing-3 border mt-3 border-dashed border-card-lightest justify-center items-start px-3 w-full h-[82px] bg-white/5 rounded-2xl'>
          <Subtitle>
            {amountUntilNFT.toLocaleString()} $BONSAI to enjoy 0% trading fees
          </Subtitle>
          <Button
            className="mt-3 max-h-[24px]"
            size="xs"
            onClick={onBuyBonsai}
          >
            <p className='leading-[1]'>
              Buy $BONSAI
            </p>
          </Button>
        </div>}
      <SmallSubtitle>
        100K $BONSAI = 1 BONSAI NFT
      </SmallSubtitle>
    </div>
  );
}

export default BonsaiNFTsSection