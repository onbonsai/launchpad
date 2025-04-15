import Link from "next/link";
import clsx from 'clsx';
import { Button } from "@src/components/Button";
import { DECIMALS, V1_LAUNCHPAD_URL, calculatePriceDelta } from '@src/services/madfi/moneyClubs';
import { BodySemiBold, Subtitle } from '@src/styles/text';
import { kFormatter, roundedToFixed } from '@src/utils/utils';
import React from 'react'
import { formatEther, formatUnits } from 'viem';
import PositiveIcon from './PositiveIcon';
import NegativeIcon from './NegativeIcon';
import BuySellModal from "@pagesComponents/Club/BuySellModal";

export enum TokenAction {
    buy,
    sell,
}

export interface BuySellAction {
    action: TokenAction;
    club: any;
}

interface ProfileTokenRowProps {
    holding: any;
    canSell: boolean;
    pressedBuySell: (action: BuySellAction) => void;
}

const ProfileTokenRow = (props: ProfileTokenRowProps) => {
    const { holding, canSell, pressedBuySell } = props;

    const previousTrades = holding?.club.prevTrade24Hr;
    const prePreviousPrice = (previousTrades?.length ?? 0) > 0 ? (previousTrades[0].price) : 0;
    const previousPrice = formatUnits(prePreviousPrice, DECIMALS);
    const priceDelta = (previousTrades?.length ?? 0) > 0 ? calculatePriceDelta(holding?.club.currentPrice, previousPrice) : { valuePct: 0, positive: false };

    const movementIcon = () => {
        if (priceDelta.positive) {
            return <PositiveIcon />
        } else if (priceDelta.valuePct !== 0) {
            return <NegativeIcon />
        }
        return null;
    }

    const priceColor = () => {
        if (priceDelta.positive) {
            return "!text-bullish"
        } else if (priceDelta.valuePct !== 0) {
            return "!text-bearish"
        }
        return ""
    }

    const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.stopPropagation();
        e.preventDefault();
        if (pressedBuySell && !!holding?.club) {
            pressedBuySell({ action: canSell ? TokenAction.sell : TokenAction.buy, club: holding!.club! });
        }
    };

    const link = holding?.club.v2
        ? `/token/${holding?.club?.clubId}`
        : `${V1_LAUNCHPAD_URL}/token/${holding?.club?.clubId}`;

    return (
        <Link href={link} legacyBehavior target="_blank">
            <div className="rounded-3xl p-3 bg-card flex flex-row justify-between flex-grow cursor-pointer hover:opacity-90">
                <div className="flex flex-row items-center">
                    <img src={holding?.token.image} alt='token-image' className='h-9 w-9 rounded-lg' />
                    <div className="flex flex-col justify-center ml-2 gap-[2px]">
                        <BodySemiBold>
                            {holding?.token.name}
                        </BodySemiBold>
                        <Subtitle>
                            {
                                holding?.club.complete
                                    ? kFormatter(parseFloat(holding?.amount ?? 0n))
                                    : roundedToFixed(parseFloat(holding?.amount ?? 0n), 2)
                            }
                            {" "}{holding?.token.symbol}
                        </Subtitle>
                    </div>
                </div>
                <div className="flex flex-row items-center justify-end gap-3">
                    <div className="flex flex-col justify-center items-end gap-1">
                        <Subtitle className='text-white'>
                            ${roundedToFixed(holding?.balance ?? 0, 2)}
                        </Subtitle>
                        {!holding?.club.complete && (
                            <Subtitle className={clsx(
                                "flex flex-row items-center justify-end",
                                priceColor()
                            )}>
                                <span className='mr-1'>{movementIcon()}</span> {priceDelta.valuePct}%
                            </Subtitle>
                        )}
                        {holding?.club.complete && (
                            <Subtitle className='!text-bullish'>graduated!</Subtitle>
                        )}
                    </div>
                    {/* TODO: not working */}
                    {/* <Button
                        className={clsx(canSell ? priceColor() : 'bg-bullish')}
                        size="sm"
                        onClick={handleButtonClick}
                    >
                        {canSell ? 'Sell' : 'Buy'}
                    </Button> */}
                </div>
            </div>
        </Link>
    )
}

export default ProfileTokenRow