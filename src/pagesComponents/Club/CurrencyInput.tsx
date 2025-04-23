import { Divider } from '@mui/material';
import { localizeNumber } from '@src/constants/utils';
import { DECIMALS, USDC_DECIMALS } from '@src/services/madfi/moneyClubs';
import { BodySemiBold, Subtitle } from '@src/styles/text';
import clsx from 'clsx'
import React, { useEffect, useRef, useState } from 'react'
import { formatUnits } from 'viem';

interface CurrencyInputProps {
  price: string;
  trailingAmount?: string;
  trailingAmountSymbol?: string;
  isError: boolean;
  tokenBalance: bigint;
  onPriceSet: (price: string) => void;
  symbol: string;
  tokenImage?: string;
  showMax?: boolean;
  overridePrice?: string;
  hideBalance?: boolean; // for register club modal
  disabled?: boolean; // no input on buy / sell price
  chain?: string;
}

const CurrencyInput = (props: CurrencyInputProps) => {
  const { symbol, trailingAmount, trailingAmountSymbol, tokenImage, tokenBalance, price, isError, onPriceSet, showMax, overridePrice, hideBalance, disabled, chain } = props;
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const measureRef = useRef(null);

  useEffect(() => {
    if (measureRef.current && inputRef.current) {
      measureRef.current.textContent = parseFloat(price || "0");
      const measureWidth = measureRef.current.offsetWidth;
      inputRef.current.style.width = `${measureWidth + (price.length > 0 ? 10 : 4)}px`;
    }
  }, [price]);

  const formattedBalance = tokenBalance ? localizeNumber(parseFloat(formatUnits(tokenBalance, symbol == "USDC" ? 6 : 18)), symbol == "USDC" || symbol === "WGHO" ? "currency" : "decimal", 0) : "0";
  const formattedPrice = overridePrice ? localizeNumber(parseFloat(overridePrice)) : formattedBalance;

  return (
    <div onClick={() => inputRef.current?.focus()} className={clsx("rounded-2xl border border-card-light focus:bg-card flex flex-col", isFocused ? "bg-card-light" : "bg-card-dark")}>
      <div className="flex flex-row w-full h-full items-center justify-between">
        <div className='flex flex-row w-full h-full items-center'>
          {tokenImage && <div className="relative items-center pl-4">
            <img
              src={tokenImage}
              alt={'token image'}
              className="w-[24px] h-[24px] object-cover rounded-lg"
            />
            {/* <img
              src={chain === "lens" ? '/lens.png' : '/base.png'}
              alt={chain}
              className="absolute top-4 left-8 h-[12px]"
            /> */}
          </div>}
          {disabled ? (
            <span
              className={clsx(
                "flex-shrink border-transparent bg-transparent shadow-sm md:text-2xl text-white sm:text-sm pt-2 pr-0 pb-2 pl-2 rounded-2xl",
                isError ? 'text-brand-highlight/90' : 'text-secondary',
              )}
            >
              {localizeNumber(parseFloat(price), symbol === "USDC" ? "currency" : "decimal", symbol === "USDC" ? 2 : undefined)}
            </span>
          ) : (
            <input
              ref={inputRef}
              type="number"
              step="1"
              placeholder="0"
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              value={price ? parseFloat(price) : ""}
              className={clsx(
                "flex-shrink border-transparent bg-transparent focus:bg-transparent shadow-sm focus:border-transparent focus:ring-transparent md:text-2xl text-white sm:text-sm pl-2 pr-0 rounded-2xl",
                isError ? 'text-brand-highlight/90' : 'text-secondary',
                "placeholder:text-secondary/70"
              )}
              onChange={(e) => {
                onPriceSet(e.target.value)
              }}
              style={{ width: 'auto' }}
              disabled={disabled}
            />
          )}
          <div className='flex flex-col h-[20px] justify-end items-end pl-2'>
            <Subtitle>
              {symbol}
            </Subtitle>
          </div>
          {/* Sneaky hidden class to get input's width */}
          <span
            ref={measureRef}
            className={clsx(
              // Match the same classes as the input for accurate rendering
              "flex-shrink border-transparent bg-transparent focus:bg-transparent shadow-sm focus:border-transparent focus:ring-transparent md:text-2xl text-white sm:text-sm pl-2 pr-0 rounded-2xl",
              isError ? 'text-brand-highlight/90' : 'text-secondary',
              "placeholder:text-secondary/70"
            )}
            style={{
              position: 'absolute',
              left: '0px',
              whiteSpace: 'pre',
              visibility: 'hidden',
            }}
          >
            {parseInt(price || "0")}
          </span>
        </div>
        {showMax && tokenBalance > 0 && (
          <div onClick={() => onPriceSet(formatUnits(tokenBalance, symbol === "USDC" ? USDC_DECIMALS : DECIMALS))} className='rounded-lg border-card border bg-card-light py-1 px-[6px] mr-3 cursor-pointer'>
            <Subtitle className='text-white tracking-[-0.02em]'>MAX</Subtitle>
          </div>
        )}
        {!showMax && trailingAmount && (
          <BodySemiBold className={clsx('mr-3', isError ? '!text-bearish/90' : 'text-white/60')}>
            {`${trailingAmount} ${trailingAmountSymbol || ""}`}
          </BodySemiBold>
        )}
      </div>
      {!hideBalance && (
        <>
          <Divider />
          <div className="flex flex-row justify-between items-center px-3 py-2">
            <Subtitle>Balance: </Subtitle>
            <Subtitle className="ml-[2px] w-full text-white text-xs">{formattedBalance}</Subtitle>
            <Subtitle>{formattedPrice}</Subtitle>
          </div>
        </>
      )}
    </div>
  )
}

export default CurrencyInput