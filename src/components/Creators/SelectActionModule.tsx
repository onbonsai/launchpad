import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { InformationCircleIcon } from "@heroicons/react/solid";
import { MintNFTCard } from "@madfi/widgets-react";
import { XIcon } from "@heroicons/react/solid";

import SelectDropdown from "@src/components/BountyDashboard/SelectDropdown";
import { Tooltip } from "@src/components/Tooltip";
import {
  REWARD_ENGAGEMENT_ACTION_MODULE,
  COLLECTION_MINT_ACTION_MODULE,
  // ZORA_LZ_MINT_ACTION_MODULE,
  PUBLICATION_BOUNTY_ACTION_MODULE,
} from "@src/services/madfi/utils";
import { getRewardUnits } from "@src/services/madfi/getMadSBTs";
import { encodeAbi } from "@src/utils/viem";

type PoolsContract = {
  id: string;
  name: string;
  symbol: string;
  ownershipToken: { owner: { id: string } }
};

const REWARD_ACTION_ENUM = 3; // should be 100 points
const REWARD_LIMIT = 0; // no limit by default

const SelectActionModule = ({
  setActionModuleWithInitData,
  activeMadSBT,
  openCollectionMintModal,
  openBountyActionModal,
  promotingToken,
  openZoraMintModal,
  clearToken
}) => {
  // const [rewardPoints, setRewardPoints] = useState("");
  const [selectedOption, setSelectedOption] = useState<any | null | undefined>();

  // useEffect(() => {
  //   const fetchRewardPoints = async () => {
  //     if (activeMadSBT) {
  //       const points = await getRewardUnits(REWARD_ACTION_ENUM);
  //       setRewardPoints(`${points} `);
  //     }
  //   };

  //   fetchRewardPoints();
  // }, [activeMadSBT, REWARD_ACTION_ENUM]);

  const actionModuleOptions = useMemo(() => {
    return [
      {
        label: 'None',
        options: [
          { label: 'None', value: '' }
        ]
      },
      // {
      //   label: 'MadFi - Promote Social Club',
      //   options: [
      //     {
      //       label: 'Badge Mint',
      //       value: COLLECTION_MINT_ACTION_MODULE,
      //       // leaving empty since the modal takes care of explaining
      //       info: '',
      //       moduleInitData: {}
      //     },
      //   ]
      // },
      // {
      //   label: 'MadFi - Reward Engagement',
      //   options: [
      //     {
      //       label: 'Comments',
      //       value: REWARD_ENGAGEMENT_ACTION_MODULE,
      //       info: `Reward your badge holders with ${rewardPoints}loyalty points for commenting on your post`,
      //       moduleInitData: { actionType: 0 }
      //     },
      //     {
      //       label: 'Mirrors',
      //       value: REWARD_ENGAGEMENT_ACTION_MODULE,
      //       info: `Reward your badge holders with ${rewardPoints}loyalty points for re-sharing your post`,
      //       moduleInitData: { actionType: 1 }
      //     },
      //     // flow not supported yet
      //     // {
      //     //   label: 'Quotes',
      //     //   value: REWARD_ENGAGEMENT_ACTION_MODULE,
      //     //   info: `Reward your badge holders with ${rewardPoints}loyalty points for re-sharing your post with a quote`,
      //     //   moduleInitData: { actionType: 2 }
      //     // }
      //   ]
      // },
      {
        label: 'MadFi - Content Bounties',
        options: [
          {
            label: 'Create Bounty',
            value: PUBLICATION_BOUNTY_ACTION_MODULE,
            // leaving empty since the modal takes care of explaining
            info: '',
            moduleInitData: {}
          },
        ]
      },
    ];
  }, []);

  const handleSelect = ({ value, info, moduleInitData }) => {
    const selectedOption = actionModuleOptions.find(group => group.options.find(option => option.value === value));
    setSelectedOption(selectedOption);

    if (!value) {
      setActionModuleWithInitData({});
      return;
    }

    let actionModuleInitData;
    if ([REWARD_ENGAGEMENT_ACTION_MODULE, COLLECTION_MINT_ACTION_MODULE].includes(value)) {
      if (!activeMadSBT?.collectionId) {
        toast.error("This smart post is only available to badge creators. Create yours now!", { duration: 5000 });
        setSelectedOption(null);
        return;
      } else if (info) {
        toast(info, { icon: "💸", duration: 10000 });
      }

      if (value === REWARD_ENGAGEMENT_ACTION_MODULE) {
        actionModuleInitData = encodeAbi(
          ['uint256', 'uint8', 'uint16', 'uint8'],
          [activeMadSBT!.collectionId, REWARD_ACTION_ENUM, REWARD_LIMIT, moduleInitData.actionType]
        );
      } else if (value === COLLECTION_MINT_ACTION_MODULE) {
        openCollectionMintModal()
        return; // modal will handle inputs and setting state
      }
    }

    if (value === PUBLICATION_BOUNTY_ACTION_MODULE) {
      openBountyActionModal()
      return; // modal will handle inputs and setting state
    }

    setActionModuleWithInitData({ actionModule: value, actionModuleInitData });
  };

  return (
    <div className="flex flex-col mt-8 mb-2 gap-4">
      {promotingToken && (
        <>
          <div className="flex items-center gap-2">
            <label htmlFor="title" className="block text-sm font-light text-secondary/70">
              Crosschain Zora Mint
            </label>
            <div className="text-sm inline-block">
              <Tooltip message="Allow anyone to mint your Zora NFT through this post" direction="top">
                <InformationCircleIcon
                  width={18}
                  height={18}
                  className="inline-block -mt-1 text-secondary mr-1"
                />
              </Tooltip>
            </div>
          </div>
          <div className="md:w-[450px] w-[300px] gap-x-4">
            <div className="col-span-1 rounded-lg bg-dark-grey shadow-md transition-all max-w-full">
              <div className="rounded-lg card card-compact max-w-full relative">
                <XIcon
                  className="absolute top-2 right-2 h-6 w-6 text-gray-500 cursor-pointer bg-black rounded-full p-1"
                  onClick={clearToken}
                />
                <MintNFTCard
                  metadata={{ ...promotingToken.metadata, chainId: promotingToken.chainId }}
                  isDarkTheme={true}
                  imageHeight={"150px"}
                  priceWei={promotingToken.priceWei}
                />
              </div>
            </div>
          </div>
        </>
      )}
      {!promotingToken && (
        <>
          <div className="flex items-center gap-2">
            <label htmlFor="title" className="block text-sm font-light text-secondary/70">
              Use Smart Post
            </label>
            <div className="text-sm inline-block">
              <Tooltip message="Enable Smart Posts such as rewarding engagement, promoting mints, and more" direction="top">
                <InformationCircleIcon
                  width={18}
                  height={18}
                  className="inline-block -mt-1 text-secondary mr-1"
                />
              </Tooltip>
            </div>
          </div>
          <div className="flex w-full gap-x-4">
            <div className="w-3/4">
              <div className="w-full relative flex items-center">
                <SelectDropdown
                  options={actionModuleOptions}
                  onChange={(option) => handleSelect(option)}
                  defaultValue={actionModuleOptions[0].options[0]}
                  isMulti={false}
                  value={selectedOption || actionModuleOptions[0].options[0]}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SelectActionModule;