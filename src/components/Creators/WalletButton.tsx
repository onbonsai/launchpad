import React, { useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';

interface WalletButtonProps {
  wallet: string;
  chain: string;
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
    return `${wallet.slice(0, 6)}...`;
  }, [wallet]);

  return (
    <button
        type="button"
        onClick={copyToClipboard}
        className="flex items-center pl-2 pr-[10px] py-1 rounded-[10px] bg-backgroundAccent text-[#ffffff] text-sm transition-colors hover:text-[#e5e7eb]"
      >
        <img src={`/${chain}.png`} alt={chain} className="flex mr-2 h-4" />
        {formattedAddress}
      </button>
  );
};

export default WalletButton;