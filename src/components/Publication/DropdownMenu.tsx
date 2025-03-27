import Popper from '@mui/material/Popper';
import ClickAwayListener from '@mui/material/ClickAwayListener';

export default ({ showDropdown, setShowDropdown, anchorEl, placement = "bottom-end" }) => {
  const handleButtonClick = (e: React.MouseEvent, callback?: () => void) => {
    e.stopPropagation();
    callback?.();
    setShowDropdown(false);
  };

  const handleClickAway = (event: MouseEvent | TouchEvent) => {
    // Check if the click target is part of the Popper
    const popperElement = document.querySelector('[data-popper-placement]');
    if (popperElement?.contains(event.target as Node)) {
      return; // Don't close if clicking within the Popper
    }
    setShowDropdown(false);
  };

  const onHide = () => {
    // Your hide logic
  };

  const onReport = () => {
    // Your report logic
  };

  return (
    <Popper
      open={showDropdown}
      anchorEl={anchorEl}
      placement={placement}
      className="z-50 pt-2"
      modifiers={[
        {
          name: 'eventListeners',
          options: {
            scroll: false,
            resize: true,
          },
        },
      ]}
    >
      <ClickAwayListener onClickAway={handleClickAway}>
        <div
          className="w-48 bg-dark-grey rounded-xl shadow-lg overflow-clip font-sf-pro-text text-white"
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={(e) => {
            // Prevent the mouseenter event from bubbling
            e.stopPropagation();
            // Find the parent group element and simulate hover
            const parentGroup = anchorEl?.closest('.group');
            if (parentGroup) {
              parentGroup.classList.add('hover');
            }
          }}
          onMouseLeave={(e) => {
            // Only remove hover if we're not still showing the dropdown
            if (!showDropdown) {
              const parentGroup = anchorEl?.closest('.group');
              if (parentGroup) {
                parentGroup.classList.remove('hover');
              }
            }
          }}
        >
          <button
            className="w-full py-3 px-4 text-left cursor-pointer hover:bg-white/10"
            onClick={(e) => handleButtonClick(e, onHide)}
          >
            Not Interested
          </button>
          <button
            className="w-full py-3 px-4 text-left cursor-pointer hover:bg-white/10"
            onClick={(e) => handleButtonClick(e, onReport)}
          >
            Report
          </button>
        </div>
      </ClickAwayListener>
    </Popper>
  );
};