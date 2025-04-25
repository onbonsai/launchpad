import { useEffect, useMemo } from 'react';
import { Popper, ClickAwayListener } from '@mui/material';
import { BookmarkAddOutlined } from "@mui/icons-material";
import { formatEther, parseEther } from 'viem';
import { Button } from '../Button';
import { Subtitle } from '@src/styles/text';
import { kFormatter } from '@src/utils/utils';
import clsx from 'clsx';
import { brandFont } from "@src/fonts/fonts";
import WalletButton from "../Creators/WalletButton";
import { LENS_CHAIN_ID } from '@src/services/madfi/utils';
import { useAccount } from 'wagmi';

const CollectModal = ({ onCollect, bonsaiBalance, collectAmount, anchorEl, setShowCollectModal, isCollecting, isMedia, account, showCollectModal }) => {
  const { chain } = useAccount();
  const handleButtonClick = (e: React.MouseEvent, callback?: () => void) => {
    e.stopPropagation();
    callback?.();
  };

  const handleClickAway = (event: MouseEvent | TouchEvent) => {
    // Check if the click target is part of the Popper
    const popperElement = document.querySelector('[data-popper-placement]');
    if (popperElement?.contains(event.target as Node)) {
      return; // Don't close if clicking within the Popper
    }
    setShowCollectModal(false);
  };

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
    if (!showCollectModal) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowCollectModal(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [showCollectModal, setShowCollectModal]);

  return (
    <Popper
      open={showCollectModal}
      anchorEl={anchorEl}
      placement="bottom-start"
      className="z-50 pt-2"
      modifiers={[
        {
          name: 'eventListeners',
          options: {
            scroll: false,
            resize: true,
          },
        },
      ]}
    >
      <ClickAwayListener onClickAway={handleClickAway}>
        <div
          className={clsx(
            "mt-2 bg-dark-grey p-4 rounded-lg shadow-lg w-[300px] space-y-4",
            brandFont.className,
            "font-sf-pro-text"
          )}
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={(e) => {
            e.stopPropagation();
            const parentGroup = anchorEl?.closest('.group');
            if (parentGroup) {
              parentGroup.classList.add('hover');
            }
          }}
          onMouseLeave={(e) => {
            if (!showCollectModal) {
              const parentGroup = anchorEl?.closest('.group');
              if (parentGroup) {
                parentGroup.classList.remove('hover');
              }
            }
          }}
        >
          {isMedia && (
            <div className="flex items-center justify-center text-center">
              <Subtitle className="text-md">
                Collect the post to participate & remix
              </Subtitle>
            </div>
          )}
          <Button
            variant="accent"
            className="w-full md:mb-0 text-base gap-x-1 p-0"
            disabled={isCollecting}
            onClick={(e) => handleButtonClick(e, onCollect)}
          >
            {(LENS_CHAIN_ID !== chain?.id) ? 'Switch to Lens Chain' : <><BookmarkAddOutlined /> {bonsaiCostFormatted} $BONSAI</>}
          </Button>
          {/* <div className="flex items-center justify-center">
            <Subtitle className="text-md text-white/40">
              Lens Account
              <span className="ml-2">{bonsaiBalanceFormatted} $BONSAI</span>
            </Subtitle>
          </div> */}
          {insufficientFunds && (
            <div className="flex space-x-3 items-center justify-center text-center">
              <Subtitle className="text-md mt-2">Deposit Funds:</Subtitle>
              <span className="mt-2"><WalletButton wallet={account} chain="lens" /></span>
            </div>
          )}
        </div>
      </ClickAwayListener>
    </Popper>
  );
};

export default CollectModal