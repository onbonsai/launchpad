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

  const handleMouseEnter = (event: React.MouseEvent<HTMLElement>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setAnchorEl(event.currentTarget);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setAnchorEl(null);
    }, 150);
  };

  const handlePopperMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
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