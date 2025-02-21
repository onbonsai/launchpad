import React, { useState, useEffect } from 'react';
import { useBalance, useAccount } from "wagmi";
import { formatEther, parseEther } from 'viem';
import { Switch, FormGroup, FormControlLabel } from "@mui/material";
import { alpha, styled } from "@mui/material/styles";
import { red } from "@mui/material/colors";
import { XIcon } from "@heroicons/react/solid";

import { Tooltip } from "@src/components/Tooltip";
import { Chains } from "@src/constants/chains";
import { BONSAI_TOKEN_ADDRESS } from "@src/services/madfi/utils";
import { kFormatter } from '@src/utils/utils';

import { MultiStepFormWrapper } from "./MultiStepFormWrapper";

const RedSwitch = styled(Switch)(({ theme }) => ({
  '& .MuiSwitch-switchBase.Mui-checked': {
    color: red[600],
    '&:hover': {
      backgroundColor: alpha(red[600], theme.palette.action.hoverOpacity),
    },
  },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
    backgroundColor: red[600],
  },
}));

interface SetPinnedLensPostProps {
  pinnedLensPost?: string;
  updateFields: (fields: any) => void;
  setRoomName: (name: string) => void;
  setInvitedHandles: (handles: string[]) => void;
  roomName?: string;
  invitedHandles: string[];
  moneyClubId?: string;
  profileHandle?: string;
  enableTips: boolean;
  enableBlackjack: boolean;
  enableCashtagFrame: boolean;
  blackjackTableAmount?: string;
  blackjackTableSize?: string;
}

const SetPinnedLensPost = ({
  pinnedLensPost,
  updateFields,
  setRoomName,
  roomName,
  invitedHandles,
  setInvitedHandles,
  moneyClubId,
  profileHandle,
  enableTips,
  enableBlackjack,
  enableCashtagFrame,
  blackjackTableAmount,
  blackjackTableSize,
}: SetPinnedLensPostProps) => {
  const { address } = useAccount();
  const { data: tokenBalance } = useBalance({
    address,
    chainId: Chains.POLYGON,
    token: BONSAI_TOKEN_ADDRESS
  });
  const [inputValue, setInputValue] = useState('');

  // const HAS_BLACKJACK_FEATURE_FLAG = tokenBalance?.value ? tokenBalance?.value > parseEther('100000') : false;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const newHandle = inputValue.trim().startsWith('@') ? inputValue.trim().substring(1) : inputValue.trim();
      if (newHandle && !invitedHandles.includes(newHandle) && invitedHandles.length < 3) {
        setInvitedHandles([...invitedHandles, newHandle]);
        setInputValue('');
      }
    }
  };

  const removeHandle = (handleToRemove) => {
    setInvitedHandles(invitedHandles.filter(handle => handle !== handleToRemove));
  };

  return (
    <MultiStepFormWrapper>
      <div className="grid grid-cols-5 gap-4 md:gap-x-20 gap-x-5">
        <div className="col-span-3 flex flex-col gap-2">
          <label htmlFor="lens-post" className="mt-4 text-md font-bold tracking-tight sm:text-lg md:text-xl">
            Stream Title
          </label>
          <input
            value={roomName}
            type="text"
            className="mt-4 block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"
            placeholder={`My stream`}
            onChange={(e) => setRoomName(e.target.value)}
          />
          {/* <label htmlFor="lens-post" className="mt-4 text-md font-bold tracking-tight sm:text-lg md:text-xl">
            Pinned Lens post
          </label>
          <input
            value={pinnedLensPost}
            type="text"
            id="pinned_post_link"
            className="mt-4 block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"
            placeholder={`https://${IS_PRODUCTION ? "" : "testnet."}hey.xyz/posts/0x21c0-0x18`}
            onChange={(e) => updateFields({ pinnedLensPost: e.target.value })}
          /> */}
        </div>
        <div className="col-span-2 flex flex-col gap-2 pt-12">
          <div className="mt-4 block w-full rounded-md bg-transparent">
            <div className="flex items-center">
              <FormGroup>
                <FormControlLabel
                  checked={enableTips}
                  control={<RedSwitch defaultChecked onChange={(e) => updateFields({ enableTips: e.target.checked })} />}
                  label="Enable Tips"
                  className="rounded-md text-secondary border-dark-grey bg-transparent shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"
                />
              </FormGroup>
              <Tooltip
                message="Allow participants to send you $BONSAI tips during the stream"
                direction="top"
              >
                <span className="text-md font-bold font-owners tracking-wide opacity-30 cursor-pointer">
                  [?]
                </span>
              </Tooltip>
            </div>
          </div>
          {/* {!!moneyClubId && (
            <div className="mt-4 block w-full rounded-md bg-transparent">
              <div className="flex items-center">
                <FormGroup>
                  <FormControlLabel
                    checked={enableCashtagFrame}
                    control={<RedSwitch onChange={(e) => updateFields({ enableCashtagFrame: e.target.checked })} />}
                    label="Promote $Cashtag"
                    className="rounded-md text-secondary border-dark-grey bg-transparent shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"
                  />
                </FormGroup>
                <Tooltip
                  message={`Allow anyone to buy/sell $${profileHandle} on the stream post`}
                  direction="top"
                >
                  <span className="text-md font-bold font-owners tracking-wide opacity-30 cursor-pointer">
                    [?]
                  </span>
                </Tooltip>
              </div>
            </div>
          )} */}
          {/* <div className="mt-4 block w-full rounded-md bg-transparent">
            <div className="flex items-center">
              <FormGroup>
                <FormControlLabel
                  control={<RedSwitch onChange={(e) => {
                    updateFields({ enableBlackjack: e.target.checked });
                    if (e.target.checked) {
                      updateFields({ enableCashtagFrame: false });
                      updateFields({ enableTips: false });
                    }
                  }} />}
                  label="Blackjack Table"
                  className="rounded-md text-secondary border-dark-grey bg-transparent shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"
                />
              </FormGroup>
              <Tooltip
                message="Include the Blackjack Frame in your livestream post, so people can play with you"
                direction="top"
              >
                <span className="text-md font-bold font-owners tracking-wide opacity-30 cursor-pointer">
                  [?]
                </span>
              </Tooltip>
            </div>
          </div> */}
        </div>
        <div className="col-span-5">
          <div className="col-span-3 flex flex-col gap-2">
            <label htmlFor="co-hosts-input" className="mt-4 text-md font-bold tracking-tight sm:text-lg md:text-xl">
              Invite Speakers? Up to 3
            </label>
            <div className="flex flex-wrap items-center gap-2 border-dark-grey bg-transparent shadow-sm rounded-md p-2">
              <div className="grid grid-cols-3 gap-2">
                {invitedHandles.map((handle, index) => (
                  <span key={index} className="rounded-lg bg-dark-grey shadow-md transition-all cursor-pointer p-2 flex items-center justify-center">
                    {handle}
                    <XIcon
                      className="ml-2 h-4 w-4 text-gray-500 cursor-pointer"
                      onClick={() => removeHandle(handle)}
                    />
                  </span>
                ))}
                {/* Empty divs to maintain the grid structure if there are fewer than 3 handles */}
                {Array.from({ length: 3 - invitedHandles.length }, (_, index) => (
                  <div key={`placeholder-${index}`} className="opacity-0"></div>
                ))}
              </div>
              <input
                value={inputValue}
                type="text"
                id="co-hosts-input"
                className="mt-2 block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"
                placeholder={'@bonsai + Enter'}
                onKeyDown={handleKeyDown}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={invitedHandles.length === 3}
              />
            </div>
          </div>
        </div>
        {enableBlackjack && (
          <div className="col-span-5 flex flex-col gap-2">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-x-4">
                  <label htmlFor="blackjack-table-amount" className="mt-4 text-md font-bold tracking-tight sm:text-lg md:text-xl">
                    Blackjack Table Amount
                  </label>
                  <Tooltip
                    message="Total amount of $BONSAI tokens to instantiate the pool with. "
                    direction="top"
                  >
                    <span className="text-sm font-bold font-owners tracking-wide opacity-30 cursor-pointer">
                      [?]
                    </span>
                  </Tooltip>
                </div>
                <div>
                  <input
                    value={blackjackTableAmount}
                    type="number"
                    step={100}
                    id="blackjack-table-amount"
                    className="mt-4 block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"
                    placeholder={`1000`}
                    onChange={(e) => updateFields({ blackjackTableAmount: e.target.value })}
                  />
                  <p className="text-sm text-secondary/70 mt-2">
                    Balance: {tokenBalance ? kFormatter(parseFloat(formatEther(tokenBalance.value!))) : 0} $BONSAI
                  </p>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-x-4">
                  <label htmlFor="blackjack-table-amount" className="mt-4 text-md font-bold tracking-tight sm:text-lg md:text-xl">
                    Blackjack Bet Size
                  </label>
                  <Tooltip
                    message="Total amount of $BONSAI tokens to instantiate the pool with. "
                    direction="top"
                  >
                    <span className="text-sm font-bold font-owners opacity-30 cursor-pointer">
                      [?]
                    </span>
                  </Tooltip>
                </div>
                <input
                  value={blackjackTableSize}
                  type="number"
                  id="blackjack-bet-size"
                  placeholder={`100`}
                  step={10}
                  className="mt-4 block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"
                  onChange={(e) => updateFields({ blackjackTableSize: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </MultiStepFormWrapper>
  );
};

export default SetPinnedLensPost;