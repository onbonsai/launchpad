import { Subtitle } from '@src/styles/text';
import { shortAddress } from '@src/utils/utils';
import React, { useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';

interface WalletButtonProps {
  wallet: string;
  chain?: string;
}

const WalletButton: React.FC<WalletButtonProps> = ({ wallet, chain }) => {

  const copyToClipboard = useCallback(() => {
    navigator.clipboard
      .writeText(wallet)
      .then(() => {
        toast("Copied");
      })
      .catch((err) => {
        console.error('Failed to copy wallet address: ', err);
      });
  }, [wallet]);

  const formattedAddress = useMemo(() => {
    return shortAddress(wallet);
  }, [wallet]);

  return (
    <button
      type="button"
      onClick={copyToClipboard}
      className="flex items-center pr-[10px] rounded-[10px] bg-backgroundAccent text-[#ffffff] text-sm transition-colors hover:text-[#e5e7eb]"
    >
      {chain && (
        <img src={`/${chain}.png`} alt={chain} className="flex mr-2 h-4" />
      )}
      <Subtitle className='text-white'>{formattedAddress}</Subtitle>
    </button>
  );
};

export default WalletButton;