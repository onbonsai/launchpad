import { useEffect, useMemo } from 'react';
import { Popper, ClickAwayListener } from '@mui/material';
import { BookmarkAddOutlined } from "@mui/icons-material";
import { formatEther, parseEther } from 'viem';
import { Button } from '../Button';
import { Subtitle } from '@src/styles/text';
import { kFormatter } from '@src/utils/utils';
import clsx from 'clsx';
import { inter } from "@src/fonts/fonts";
import WalletButton from "../Creators/WalletButton";

const CollectModal = ({ onCollect, bonsaiBalance, collectAmount, anchorEl, onClose, isCollecting, isMedia, account }) => {
  const bonsaiBalanceFormatted = useMemo(() => (
    kFormatter(parseFloat(formatEther(bonsaiBalance || 0n)), true)
  ), [bonsaiBalance]);

  const bonsaiCostFormatted = useMemo(() => (
    kFormatter(parseFloat(collectAmount), true)
  ), [collectAmount]);

  const collectAmountBn = useMemo(() => {
    if (collectAmount) return parseEther(collectAmount);
    return 0n;
  }, [collectAmount]);

  const insufficientFunds = bonsaiBalance < collectAmountBn;

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  return (
    <Popper
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      placement="bottom-start"
      style={{ zIndex: 1400 }}
    >
      <ClickAwayListener onClickAway={onClose}>
        <div className={clsx("mt-2 bg-dark-grey p-4 rounded-xl shadow-lg w-[300px] space-y-4", inter.className, "font-sf-pro-text")}>
          {isMedia && (
            <div className="flex items-center justify-center text-center">
              <Subtitle className="text-md">
                Collect to join the post
              </Subtitle>
            </div>
          )}
          <Button
            variant="accent"
            className="w-full md:mb-0 text-base gap-x-1"
            disabled={isCollecting || collectAmountBn > bonsaiBalance}
            onClick={onCollect}
          >
            <BookmarkAddOutlined /> {bonsaiCostFormatted} $BONSAI
          </Button>
          <div className="flex items-center justify-center">
            <Subtitle className="text-md">
              Account Balance:
              <span className="ml-2">{bonsaiBalanceFormatted} $BONSAI</span>
            </Subtitle>
          </div>
          {insufficientFunds && (
            <div className="flex space-x-1">
              <Subtitle className="text-md mt-2">Deposit Funds</Subtitle>
              <WalletButton wallet={account} chain="lens" />
            </div>
          )}
        </div>
      </ClickAwayListener>
    </Popper>
  );
};

export default CollectModal