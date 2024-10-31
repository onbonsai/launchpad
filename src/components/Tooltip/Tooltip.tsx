import { ReactNode, useState } from "react";
import { Tooltip as MuiTooltip, TooltipProps } from "@mui/material";
import { styled } from "@mui/material/styles";

// Custom styled tooltip to match the existing design
const StyledTooltip = styled(({ className, ...props }: TooltipProps) => (
  <MuiTooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .MuiTooltip-tooltip`]: {
    backgroundColor: '#1D212A',
    color: '#ffffff',
    fontSize: '14px',
    fontFamily: '"Favorit", sans-serif',
    fontWeight: 'normal',
    padding: '6px 12px', // reduced padding
    borderRadius: '6px', // rounded-sm equivalent
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', // shadow-md equivalent
    maxWidth: '300px',
    lineHeight: '1.4',
    textAlign: 'center',
  },
  [`& .MuiTooltip-arrow`]: {
    color: '#1D212A',
    fontSize: '8px',
  },
}));

export const Tooltip = ({
  message,
  children,
  direction = "right",
  classNames,
  disabled = false,
  open,
}: {
  message: string;
  children: ReactNode;
  direction?: "right" | "top" | "left" | "bottom";
  classNames?: string;
  disabled?: boolean;
  open?: boolean;
}) => {
  const [hoverOpen, setHoverOpen] = useState(false);

  if (disabled) return <>{children}</>;

  // Map direction props to MUI placement
  const getPlacement = (direction: string): TooltipProps['placement'] => {
    switch (direction) {
      case "top":
        return "top";
      case "left":
        return "left";
      case "bottom":
        return "bottom";
      case "right":
      default:
        return "right";
    }
  };

  // Combine programmatic open state with hover state
  const isOpen = open || hoverOpen;

  return (
    <StyledTooltip
      title={message}
      placement={getPlacement(direction)}
      arrow
      className={classNames}
      open={isOpen}
      onOpen={() => setHoverOpen(true)}
      onClose={() => setHoverOpen(false)}
    >
      <span className="inline-flex">
        {children}
      </span>
    </StyledTooltip>
  );
};