import { DECIMALS } from '@src/services/madfi/moneyClubs';
import { BodySemiBold, Subtitle } from '@src/styles/text';
import { roundedToFixed } from '@src/utils/utils';
import React from 'react'
import { formatUnits } from 'viem';

interface ProfileTokenRowProps {
    holding: any;
}

const ProfileTokenRow = (props: ProfileTokenRowProps) => {
    const { holding } = props;
  return (
    <div className="rounded-3xl p-3 bg-card flex flex-row space-between">
        <div>
            <img src={holding.token.image} alt='token-image' className='h-9 w-9 rounded-xl' />
            <div className="flex flex-col justify-center ml-2">
                <BodySemiBold>
                {holding.token.name}
                </BodySemiBold>
                <Subtitle>
                    {roundedToFixed(parseFloat(formatUnits(holding.amount, DECIMALS)), 2)} {holding.token.symbol}
                </Subtitle>
            </div>
        </div>
    </div>
  )
}

export default ProfileTokenRow