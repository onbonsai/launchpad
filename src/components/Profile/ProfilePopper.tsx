import { useState, useRef } from 'react';
import Popper from '@mui/material/Popper';
import { Account } from '@lens-protocol/client';
import { ProfilePopperContent } from './ProfilePopperContent';

interface ProfilePopperProps {
  children: React.ReactElement;
  profile: Account;
  followed: Record<string, boolean>;
  setFollowed: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export const ProfilePopper = ({ children, profile, followed, setFollowed }: ProfilePopperProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const popperRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);

  const handleMouseEnter = (event: React.MouseEvent<HTMLElement>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Store the target element
    targetRef.current = event.currentTarget;

    // Clear any existing debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set a new debounce timer
    debounceRef.current = setTimeout(() => {
      if (targetRef.current) {
        setAnchorEl(targetRef.current);
      }
    }, 500);
  };

  const handleMouseLeave = () => {
    // Clear the debounce timer if it exists
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    targetRef.current = null;

    timeoutRef.current = setTimeout(() => {
      setAnchorEl(null);
    }, 150);
  };

  const handlePopperMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    // Keep the popper open when mouse enters it
    if (targetRef.current) {
      setAnchorEl(targetRef.current);
    }
  };

  const handlePopperMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setAnchorEl(null);
    }, 150);
  };

  const open = Boolean(anchorEl);

  return (
    <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
      <Popper
        open={open}
        anchorEl={anchorEl}
        placement="bottom-start"
        style={{ zIndex: 1500 }}
        modifiers={[
          {
            name: 'offset',
            options: {
              offset: [0, 8],
            },
          },
          {
            name: 'flip',
            options: {
              fallbackPlacements: ['top-start'],
            },
          },
        ]}
      >
        <div
          ref={popperRef}
          onMouseEnter={handlePopperMouseEnter}
          onMouseLeave={handlePopperMouseLeave}
        >
          <ProfilePopperContent
            profile={profile}
            followed={followed}
            setFollowed={setFollowed}
          />
        </div>
      </Popper>
    </div>
  );
};