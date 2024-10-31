import { useState, useEffect, useMemo } from "react";
import { getAddress, parseEther } from "viem";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { isEmpty } from "lodash/lang";
import { useRouter } from "next/router";
import { advancedContractCondition, ConditionComparisonOperator } from '@lens-protocol/metadata';

import SelectDropdown from "@src/components/BountyDashboard/SelectDropdown";
import { validChainNames } from "@src/constants/validChainId";
import { useAllowedSocialTokens } from "@src/hooks/useAllowedSocialTokens";

type PoolsContract = {
  id: string;
  name: string;
  symbol: string;
  ownershipToken: { owner: { id: string } }
};

const SelectGatedPostCondition = ({ gatedCondition, setGatedCondition, activeMadSBT }) => {
  const {
    query: { source, address: queryTokenAddress, chainId: queryTokenChainId },
  } = useRouter();
  const { address } = useAccount();
  // if we get the query params to select pools by default, do it
  const defaultGatedBy = source === "p00ls" && queryTokenAddress
    ? "POOLS"
    : "NONE";
  const [gatedBy, setGatedBy] = useState(defaultGatedBy);

  const { data: poolsTokensByChainId, isLoading: isLoadingSocialTokens } = useAllowedSocialTokens(address);

  const dropdownOptions = [
    {
      label: 'Public',
      options: [
        { label: 'Public', value: 'NONE' }
      ]
    },
    // {
    //   label: 'MadFi',
    //   options: [
    //     { label: 'Badge Holders', value: 'BADGE_HOLDERS' },
    //     { label: 'Active Subscribers', value: 'SUBSCRIBERS' }
    //   ]
    // },
    {
      label: 'Social Tokens',
      options: [
        { label: 'P00LS Token Holders', value: 'POOLS' }
      ]
    },
  ];

  useEffect(() => {
    if (gatedBy === "BADGE_HOLDERS") {
      if (!activeMadSBT.collectionId) {
        toast.error("Only available to badge creators. Create yours now!", { duration: 5000 });
      } else {
        toast.success("Only badge holders can view this post", { duration: 5000 });
        setGatedCondition({ members: true });
      }
    } else if (gatedBy === "SUBSCRIBERS") {
      toast.success("Only active subscribers can view this post", { duration: 5000 });
      setGatedCondition({ subscribers: true });
    } else if (gatedBy === "POOLS") {
      if (isLoadingSocialTokens) return;
      if (isEmpty(poolsTokensByChainId)) {
        toast.error("Only available to social token creators. Go to https://p00ls.io", { duration: 7000 });
      } else {
        if (!defaultPoolsOption || gatedCondition) {
          toast("Select your social token", { duration: 5000 });
        } else if (!gatedCondition) {
          setPoolsGating(defaultPoolsOption);
        }
      }
    } else if (gatedBy === "NONE") { // to reset
      setGatedCondition(undefined);
    }
  }, [gatedBy, isLoadingSocialTokens]);

  const defaultOption = useMemo(() => {
    if (gatedBy === "POOLS") return dropdownOptions[1].options[0];

    return dropdownOptions[0].options[0];
  }, [gatedBy]);

  const poolsDropdownOptions = useMemo(() => {
    if (poolsTokensByChainId && !isEmpty(poolsTokensByChainId)) {
      return Object.keys(poolsTokensByChainId).map((chainId) => {
        const options = poolsTokensByChainId[chainId].map((contract: PoolsContract) => ({
          label: contract.symbol,
          value: getAddress(contract.id),
          chainId,
        }));

        return { label: validChainNames[chainId], options, chainId };
      });
    }

    return [];
  }, [poolsTokensByChainId]);

  const defaultPoolsOption = useMemo(() => {
    if (poolsDropdownOptions?.length) {
      if (source === "p00ls" && queryTokenAddress && queryTokenChainId) {
        const chain = poolsDropdownOptions.find(({ chainId }) => chainId === queryTokenChainId);
        return chain?.options.find(({ value }) => value.toLowerCase() === (queryTokenAddress as string).toLowerCase());
      } else {
        return poolsDropdownOptions[0].options[0];
      }
    }
  }, [poolsDropdownOptions]);

  const setPoolsGating = ({ chainId, value, label }) => {
    toast.success(`Only ${label} holders can view this post`, { duration: 5000 });
    const _advancedContractCondition = advancedContractCondition({
      abi: 'function balanceOf(address account) view returns (uint256 amount)',
      comparison: ConditionComparisonOperator.GREATER_THAN_OR_EQUAL,
      contract: { address: value, chainId: parseInt(chainId) },
      functionName: 'balanceOf',
      params: [':userAddress'],
      value: parseEther('1').toString()
    });
    setGatedCondition({ advancedContractCondition: _advancedContractCondition });
  }

  return (
    <div className="flex flex-col mt-8 mb-2 gap-4">
      <div className="w-full">
        <label htmlFor="title" className="block text-sm font-light text-secondary/70">
          Post Visibility
        </label>
      </div>
      <div className="flex w-full gap-x-4">
        <div className="w-1/2">
          <div className="w-full relative flex items-center">
            <SelectDropdown
              options={dropdownOptions}
              onChange={(option) => setGatedBy(option ? option.value : null)}
              defaultValue={defaultOption}
              isMulti={false}
            />
          </div>
        </div>
        <div className="w-1/2">
          {gatedBy == 'POOLS' && !!poolsDropdownOptions?.length && (
            <SelectDropdown
              options={poolsDropdownOptions}
              onChange={setPoolsGating}
              placeholder={"Select a token..."}
              defaultValue={defaultPoolsOption}
              isMulti={false}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectGatedPostCondition;