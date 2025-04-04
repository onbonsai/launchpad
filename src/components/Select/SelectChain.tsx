import React, { useEffect, useState } from "react";
import Select, { ActionMeta, ValueType, components, StylesConfig } from "react-select";
import Image from 'next/image';
import { formatEther } from "viem";
import { kFormatter } from "@src/utils/utils";

const CustomOption = ({ children, ...props }: any) => {
  const { data } = props;

  return (
    <components.Option {...props}>
      <div className="flex items-center justify-between w-full font-sf-pro-text">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center bg-white/5">
            <Image
              src={data.icon}
              alt={data.label}
              width={24}
              height={24}
              className="w-6 h-6 object-cover min-w-[24px] min-h-[24px]"
            />
          </div>
          <span>{data.label}</span>
        </div>
        <span className="text-md text-gray-400 flex">{
            kFormatter(parseFloat(formatEther(data.balance || 0n)), true)
          } $BONSAI</span>
      </div>
    </components.Option>
  );
};

const CustomSingleValue = ({ children, ...props }: any) => {
  const { data } = props;

  return (
    <components.SingleValue {...props}>
      <div className="flex items-center gap-2 font-sans">
        <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center bg-white/5">
          <Image
            src={data.icon}
            alt={data.label}
            width={24}
            height={24}
            className="w-6 h-6 object-cover min-w-[24px] min-h-[24px]"
          />
        </div>
        <span>{data.label}</span>
      </div>
    </components.SingleValue>
  );
};

const SelectDropdown: React.FC<{
  options: any[];
  onChange: (value: any, actionMeta: ActionMeta<any>) => void;
  placeholder?: string;
  defaultValue?: any;
  isMulti?: boolean;
  zIndex?: number;
  value?: any;
  isDisabled?: boolean;
}> = ({ options, onChange, placeholder, defaultValue, isMulti = true, zIndex, value, isDisabled }) => {
  const [menuPortalTarget, setMenuPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMenuPortalTarget(document?.body || null);
  }, []);

  const customStyles: StylesConfig = {
    control: (styles) => ({
      ...styles,
      backgroundColor: 'transparent',
      border: '1px solid rgb(55, 65, 81)',
      borderRadius: '0.5rem',
      padding: '0.25rem',
    }),
    option: (styles, { isFocused, isSelected }) => ({
      ...styles,
      backgroundColor: isSelected
        ? 'rgb(55, 65, 81)'
        : isFocused
        ? 'rgba(55, 65, 81, 0.5)'
        : 'transparent',
      cursor: 'pointer',
      ':active': {
        backgroundColor: 'rgb(55, 65, 81)',
      },
    }),
    input: (provided: any) => ({
      ...provided,
      color: "#a1a1aa",
      cursor: "pointer",
    }),
    indicatorSeparator: (provided: any) => ({
      ...provided,
      backgroundColor: "#262626",
    }),
    multiValue: (provided: any) => ({
      ...provided,
      backgroundColor: "rgb(38 38 38 / var(--tw-bg-opacity))",
    }),
    multiValueLabel: (provided: any) => ({
      ...provided,
      color: "#fff",
    }),
    multiValueRemove: (provided: any, { isFocused }: any) => ({
      ...provided,
      color: "inherit",
      ":hover": {
        backgroundColor: "transparent",
        color: "inherit",
      },
    }),
    group: (provided: any) => ({
      ...provided,
      backgroundColor: "#141414",
    }),
    groupHeading: (provided: any) => ({
      ...provided,
      backgroundColor: "#141414",
    }),
    singleValue: (provided: any) => ({
      ...provided,
      color: "#a1a1aa",
    }),
    placeholder: (provided: any) => ({
      ...provided,
      color: "#a1a1aa70",
    }),
    dropdownIndicator: (provided: any) => ({
      ...provided,
      color: "#a1a1aa",
      cursor: "default",
      "&:hover": {
        color: "#a1a1aa",
      },
    }),
    menu: (provided: any) => ({
      ...provided,
      color: "#a1a1aa",
      backgroundColor: "rgba(255, 255, 255, 0.03)",
    }),
    menuPortal: (base) => ({ ...base, zIndex }),
  };

  const handleChange = (value: ValueType<any>, actionMeta: ActionMeta<any>) => {
    onChange(value, actionMeta);
  };

  return (
    <div className="w-full">
      <Select
        value={value}
        options={options}
        styles={customStyles}
        components={{
          Option: CustomOption,
          SingleValue: CustomSingleValue
        }}
        onChange={handleChange}
        isSearchable
        isMulti={isMulti}
        placeholder={placeholder}
        defaultValue={defaultValue}
        menuPortalTarget={menuPortalTarget}
        menuPosition={"fixed"}
        isDisabled={isDisabled}
      />
    </div>
  );
};

export default SelectDropdown;
