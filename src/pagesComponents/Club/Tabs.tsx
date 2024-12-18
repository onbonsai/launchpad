import { ToggleButton } from "@mui/material";
import { StyledToggleButtonGroup } from "@pagesComponents/Dashboard/BondingCurveSelector";

const tabs = [
  { name: "Feed", id: 1 },
  { name: "Trades", id: 2 },
  { name: "Holders", id: 3 },
];

export const Tabs = ({ openTab, setOpenTab }) => {
  const handleChange = (event, newValue) => {
    if (newValue !== null) {
            setOpenTab(newValue);
    }
};

  return (
    <div className="md:flex justify-end w-full">
      <StyledToggleButtonGroup
        value={openTab}
        exclusive
        onChange={handleChange}
        aria-label="Price tier"
     >
        {tabs.map((tab, index) => (
                  <ToggleButton key={index} value={tab.id} aria-label={tab.name}>
                          {tab.name}
                  </ToggleButton>
        ))}
     </StyledToggleButtonGroup>
    </div>
  );
}
