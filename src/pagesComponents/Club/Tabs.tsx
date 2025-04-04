import { ToggleButton } from "@mui/material";
import { StyledToggleButtonGroup } from "@pagesComponents/Dashboard/BondingCurveSelector";
import { useMemo } from "react";
import useIsMounted from "@src/hooks/useIsMounted";

const tabs = [
  { name: "Feed", id: 1 },
  { name: "Trades", id: 2 },
  { name: "Holders", id: 3 },
];

export const Tabs = ({ openTab, setOpenTab, withFeed }) => {
  const isMounted = useIsMounted();
  const handleChange = (event, newValue) => {
      if (newValue !== null) {
              setOpenTab(newValue);
      }
  };

  const _tabs = useMemo(() => {
    if (withFeed) {
      return tabs;
    }

    return [
      { name: "Trades", id: 2 },
      { name: "Holders", id: 3 },
    ];
  }, [withFeed]);

  if (!isMounted) return null;

  return (
    <div className="md:flex justify-end w-full">
      <StyledToggleButtonGroup
        value={openTab}
        exclusive
        onChange={handleChange}
        aria-label="Price tier"
     >
        {_tabs.map((tab, index) => (
                  <ToggleButton key={index} value={tab.id} aria-label={tab.name}>
                          {tab.name}
                  </ToggleButton>
        ))}
     </StyledToggleButtonGroup>
    </div>
  );
}
