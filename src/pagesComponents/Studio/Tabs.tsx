import { ToggleButton } from "@mui/material";
import { StyledToggleButtonGroup } from "@pagesComponents/Dashboard/BondingCurveSelector";

const tabs = [
  { name: "Media", id: 1 },
  { name: "Token", id: 2 },
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
        aria-label="Price tier"
        sx={{
          '& .MuiToggleButton-root': {
            cursor: 'default',
            '&:hover': {
              backgroundColor: 'transparent'
            }
          }
        }}
     >
        {tabs.map((tab, index) => (
          <ToggleButton
            key={index}
            value={tab.id}
            aria-label={tab.name}
            disableRipple
          >
                  {tab.name}
          </ToggleButton>
        ))}
     </StyledToggleButtonGroup>
    </div>
  );
}
