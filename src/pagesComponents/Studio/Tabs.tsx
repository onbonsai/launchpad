import { ToggleButton } from "@mui/material";
import { StyledToggleButtonGroup } from "@pagesComponents/Dashboard/BondingCurveSelector";

export const Tabs = ({ openTab, setOpenTab, addToken }) => {
  // const handleChange = (event, newValue) => {
  //     if (newValue !== null) {
  //             setOpenTab(newValue);
  //     }
  // };

  const tabs = [
    { name: "Media", id: 1 },
    addToken ? { name: "Token", id: 2 } : undefined,
    { name: "Finalize", id: 3 },
  ].filter(t => t) ;

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
