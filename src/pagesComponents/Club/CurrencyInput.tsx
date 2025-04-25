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
  secondaryToken?: {
    image: string;
    symbol: string;
    onClick: () => void;
  };
}

const CurrencyInput = (props: CurrencyInputProps) => {
  const { symbol, trailingAmount, trailingAmountSymbol, tokenImage, tokenBalance, price, isError, onPriceSet, showMax, overridePrice, hideBalance, disabled, chain, secondaryToken } = props;
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (measureRef.current && inputRef.current) {
      measureRef.current.textContent = parseFloat(price || "0").toString();
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
            {secondaryToken && (
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  secondaryToken.onClick();
                }}
                className="absolute -right-2 -bottom-2 w-[20px] h-[20px] rounded-full bg-[#333] border border-card cursor-pointer hover:bg-[#444] transition-colors"
              >
                <img
                  src={secondaryToken.image}
                  alt={secondaryToken.symbol}
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
            )}
          </div>}
          {disabled ? (
            <span
              className={clsx(
                "flex-shrink border-transparent bg-transparent shadow-sm md:text-2xl text-white sm:text-sm pt-2 pr-0 pb-2 pl-2 rounded-2xl",
                isError ? 'text-bearish/90' : 'text-secondary',
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
                isError ? 'text-bearish/90' : 'text-secondary',
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