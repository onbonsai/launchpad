import { ToggleButton } from "@mui/material";
import { StyledToggleButtonGroup } from "@pagesComponents/Dashboard/BondingCurveSelector";
import useIsMounted from "@src/hooks/useIsMounted";

const tabs = [
  { name: "Created", id: 1 },
  { name: "Collected", id: 2 },
];

export const Tabs = ({ openTab, setOpenTab }) => {
  const isMounted = useIsMounted();
  const handleChange = (event, newValue) => {
      if (newValue !== null) {
              setOpenTab(newValue);
      }
  };

  if (!isMounted) return null;

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
