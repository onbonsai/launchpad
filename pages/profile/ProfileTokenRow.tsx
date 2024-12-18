import clsx from 'clsx';
import { Button } from "@src/components/Button";
import { DECIMALS, calculatePriceDelta } from '@src/services/madfi/moneyClubs';
import { BodySemiBold, Subtitle } from '@src/styles/text';
import { roundedToFixed } from '@src/utils/utils';
import React from 'react'
import { formatUnits } from 'viem';
import PositiveIcon from './PositiveIcon';
import NegativeIcon from './NegativeIcon';

enum TokenAction {
    buy,
    sell,
}
interface ProfileTokenRowProps {
    holding: any;
    canSell: boolean;
    pressedBuySell?: (action: TokenAction) => void;
}

const ProfileTokenRow = (props: ProfileTokenRowProps) => {
    const { holding, canSell, pressedBuySell } = props;

    const previousTrades = holding?.club.prevTrade24Hr;
    const previousPrice = (previousTrades?.length ?? 0) > 0 ? previousTrades[0].price : 0;
    const priceDelta = (previousTrades?.length ?? 0) > 0 ? calculatePriceDelta(holding.club.currentPrice, previousPrice) : {valuePct: 0, positive: false};

    const movementIcon = () => {
        if (priceDelta.positive) {
            return <PositiveIcon />
        } else if (priceDelta.valuePct !== 0) {
            return <NegativeIcon />
        }
        return null;
    }

    const priceColor = () => {
        if (priceDelta.positive ) {
            return "text-bullish"
        } else if (priceDelta.valuePct !== 0) {
            return "text-bearish"
        }
        return ""
    }

    return (
        <div className="rounded-3xl p-3 bg-card flex flex-row justify-between flex-grow">
            <div className="flex flex-row items-center">
                <img src={holding?.token.image} alt='token-image' className='h-9 w-9 rounded-xl' />
                <div className="flex flex-col justify-center ml-2 gap-[2px]">
                    <BodySemiBold>
                    {holding?.token.name}
                    </BodySemiBold>
                    <Subtitle>
                        {roundedToFixed(parseFloat(formatUnits(holding?.amount ?? 0n, DECIMALS)), 2)} {holding?.token.symbol}
                    </Subtitle>
                </div>
            </div>
            <div className="flex flex-row items-center justify-end gap-3">
                <div className="flex flex-col justify-center items-end gap-1">
                    <Subtitle className='text-white'>
                        ${roundedToFixed(holding?.balance ?? 0, 2)}
                    </Subtitle>
                    <Subtitle className={clsx(
                        "flex flex-row items-center justify-end",
                        priceColor()
                    )}>
                        <span className='mr-1'>{movementIcon()}</span> {previousPrice} • {priceDelta.valuePct}%
                    </Subtitle>
                </div>
                <Button
                    className={clsx(canSell ? priceColor() : 'bg-bullish')}
                    size="sm"
                    onClick={() => pressedBuySell?.(canSell ? TokenAction.sell : TokenAction.buy)}
                >
                    {canSell ? 'Sell' : 'Buy'}
                </Button>
            </div>
        </div>
    )
}

export default ProfileTokenRow