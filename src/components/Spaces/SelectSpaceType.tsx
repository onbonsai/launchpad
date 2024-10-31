import { useEffect, useState } from "react";
import { RadioGroup } from "@headlessui/react";
import { VideoCameraIcon, MicrophoneIcon } from "@heroicons/react/solid";
import toast from "react-hot-toast";

import SelectDropdown from "@src/components/BountyDashboard/SelectDropdown";

import { MultiStepFormWrapper } from "./MultiStepFormWrapper";

const iconsSize = 18;

const spaceTypes = [
  {
    id: 1,
    label: "Video",
    icon: <VideoCameraIcon key="2" width={iconsSize} height={iconsSize} className="inline-block mr-2" />,
    value: "video",
  },
  {
    id: 2,
    label: "[SOON] Discussion",
    icon: <MicrophoneIcon key="1" width={iconsSize} height={iconsSize} className="inline-block mr-2" />,
    value: "discussion",
    disabled: true, // until we support
  },
];

const SelectSpaceType = ({
  spaceType,
  setSpaceType,
  gatedBy,
  setGatedBy,
  collectionId,
}: {
  spaceType: string;
  setSpaceType: (v: string) => void;
  collectionId?: string;
  gatedBy?: any;
  setGatedBy: (v: any) => void;
}) => {
  const dropdownOptions = [
    {
      label: 'Public',
      options: [
        { label: 'Public', value: 'NONE' }
      ]
    },
    {
      label: 'Gated',
      options: [
        { label: 'Badge Holders', value: { tier: 'BADGE_HOLDERS', collectionId } }
      ]
    },
  ];

  useEffect(() => {
    if (!spaceType) setSpaceType(spaceTypes[0].value);
  }, [spaceType]);

  useEffect(() => {
    if (!gatedBy) setGatedBy(dropdownOptions[0].options[0]);
  }, [gatedBy])

  return (
    <MultiStepFormWrapper>
      <div className="w-full flex flex-col gap-2">
        <RadioGroup value={spaceType} onChange={(value) => setSpaceType(value)}>
          <label htmlFor="stream-type" className="mt-4 text-md font-bold tracking-tight sm:text-lg md:text-xl">
            What type of livestream?
          </label>
          <div className="flex space-x-6 mt-4 items-start">
            {spaceTypes.map((space) => (
              <RadioGroup.Option
                key={space.id}
                value={space.value}
                disabled={space.disabled}
                className={({ checked }) =>
                  `border border-dark-grey ${checked ? "bg-white" : "bg-transparent"}
                  relative flex ${!space.disabled ? 'cursor-pointer' : ''} rounded-lg px-5 py-4 shadow-md focus:outline-none`
                }
              >
                {({ checked }) => (
                  <>
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center">
                        <div className="text-md">
                          <RadioGroup.Label as="p" className={`font-bold  ${checked ? "text-black" : "text-white"} select-none`}>
                            <span>{space.icon}{space.label}</span>
                          </RadioGroup.Label>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </RadioGroup.Option>
            ))}
          </div>
        </RadioGroup>
        <div className="w-full flex flex-col gap-2">
          <label htmlFor="gated" className="mt-4 text-md font-bold tracking-tight sm:text-lg md:text-xl">
            Public or Gated?
          </label>
          <div className="w-full relative flex items-center">
            <SelectDropdown
              options={dropdownOptions}
              onChange={(option) => setGatedBy(option)}
              value={gatedBy}
              isMulti={false}
              zIndex={50}
            />
          </div>
        </div>
      </div>
    </MultiStepFormWrapper>
  );
};

export default SelectSpaceType;