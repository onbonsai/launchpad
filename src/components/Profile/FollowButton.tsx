import { FC } from 'react';
import { Button } from "@src/components/Button";

interface FollowButtonProps {
  isFollowing: boolean;
  onFollowClick: () => void;
  disabled?: boolean;
}

export const FollowButton: FC<FollowButtonProps> = ({ 
  isFollowing, 
  onFollowClick, 
  disabled = false 
}) => {
  return (
    <Button
      onClick={onFollowClick}
      disabled={disabled}
      variant={isFollowing ? "primary" : "secondary"}
      className="mt-4"
    >
      {isFollowing ? 'Unfollow' : 'Follow'}
    </Button>
  );
}; 