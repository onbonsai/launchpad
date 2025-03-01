import React, { useEffect, useState } from "react";
import Select, { ActionMeta, ValueType } from "react-select";

const SelectDropdown: React.FC<{
  options: any[];
  onChange: (value: any, actionMeta: ActionMeta<any>) => void;
  placeholder?: string;
  defaultValue?: any;
  isMulti?: boolean;
  zIndex?: number;
  value?: any;
}> = ({ options, onChange, placeholder, defaultValue, isMulti = true, zIndex, value }) => {
  const [menuPortalTarget, setMenuPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMenuPortalTarget(document?.body || null);
  }, []);

  const customStyles = {
    control: (provided: any) => ({
      ...provided,
      backgroundColor: "transparent",
      borderColor: "#262626",
      borderWidth: 1,
      borderRadius: "0.375rem",
      boxShadow: "none",
      "&:hover": {
        borderColor: "#262626",
      },
      minHeight: "2.5rem",
      outline: "none !important",
    }),
    input: (provided: any) => ({
      ...provided,
      color: "#a1a1aa",
      cursor: "default",
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
    option: (provided: any, { isFocused, isSelected }: any) => ({
      ...provided,
      color: "#a1a1aa",
      backgroundColor: "#141414",
      fontWeight: isSelected ? 500 : 400,
      "&:hover": {
        backgroundColor: "#1C1D1C",
      },
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
        onChange={handleChange}
        isSearchable
        isMulti={isMulti}
        placeholder={placeholder}
        defaultValue={defaultValue}
        menuPortalTarget={menuPortalTarget}
        menuPosition={"fixed"}
      />
    </div>
  );
};

export default SelectDropdown;
