import { FC } from 'react';
import { Button } from "@src/components/Button";

interface FollowButtonProps {
  isFollowing: boolean;
  onFollowClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
}

export const FollowButton: FC<FollowButtonProps> = ({
  isFollowing,
  onFollowClick,
  disabled = false
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onFollowClick(e);
  };

  return (
    <Button
      size="sm"
      onClick={handleClick}
      disabled={disabled}
      variant={isFollowing ? "primary" : "secondary"}
      className={`mt-2 group transition-colors duration-150 ease-in-out
        ${isFollowing
          ? 'hover:bg-transparent hover:border-red-500'
          : ''
        }`
      }
    >
      {isFollowing ? (
        <div className="relative overflow-hidden">
          <span className="block transition-transform duration-150 ease-in-out group-hover:-translate-y-full">
            Following
          </span>
          <span className="absolute top-0 left-0 w-full text-center transition-transform duration-150 ease-in-out translate-y-full group-hover:translate-y-0 text-red-500">
            Unfollow
          </span>
        </div>
      ) : (
        "Follow"
      )}
    </Button>
  );
};