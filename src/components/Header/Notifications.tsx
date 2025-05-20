import { useState, useEffect, useRef, useMemo } from "react";
import { NotificationsOutlined } from "@mui/icons-material";
import { HeartIcon, ChatIcon, BookmarkIcon } from "@heroicons/react/outline";
import { useWalletClient } from "wagmi";
import { useInView } from "react-intersection-observer";
import { Account, Post } from "@lens-protocol/client";
import Link from "next/link";
import useLensSignIn from "@src/hooks/useLensSignIn";
import { useGetNotifications } from "@src/services/lens/getNotifications";
import Spinner from "../LoadingSpinner/LoadingSpinner";
import { Button } from "../Button";
import { getPostContentSubstring } from "@src/utils/utils";
import { ProfilePopper } from "../Profile/ProfilePopper";
import Image from "next/image";

const LAST_SEEN_NOTIFICATION_KEY = 'last_seen_notification_id';

export const Notifications = ({ openMobileMenu, isMobile, onShowChange }: { openMobileMenu?: boolean; isMobile?: boolean; onShowChange?: (show: boolean) => void }) => {
  const { ref, inView } = useInView();
  const { data: walletClient } = useWalletClient();
  const { authenticatedProfileId } = useLensSignIn(walletClient);
  const { data, fetchNextPage, isFetchingNextPage, hasNextPage, isLoading } = useGetNotifications(authenticatedProfileId);
  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const notifs = useMemo(() => data?.pages.flatMap(page => page.notifications) || [], [isLoading]);
  const [showTooltip, setShowTooltip] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Group notifications, combining reactions for the same post
  const groupedNotifications = useMemo(() => {
    const lastSeenId = localStorage.getItem(LAST_SEEN_NOTIFICATION_KEY);

    // If the latest notification is different from last seen, find the range
    let foundLastSeen = !lastSeenId; // If no last seen ID, consider all as new
    const isNewMap = new Map<string, boolean>();

    // First pass: mark notifications as new until we find the last seen one
    notifs.forEach(notification => {
      if (notification.id === lastSeenId) {
        foundLastSeen = true;
        isNewMap.set(notification.id, false);
      } else if (!foundLastSeen) {
        isNewMap.set(notification.id, true);
      } else {
        isNewMap.set(notification.id, false);
      }
    });

    const grouped = notifs.reduce((acc, notification) => {
      const isNew = isNewMap.get(notification.id) || false;

      if (notification.__typename === "ReactionNotification") {
        const postId = notification.post.slug;
        if (!acc[postId]) {
          // Create new grouped reaction notification
          acc[postId] = {
            id: `reaction-${postId}`,
            __typename: "ReactionNotification",
            post: notification.post,
            reactions: [notification.reactions[0]],
            isNew,
          };
        } else {
          // Add to existing group
          acc[postId].reactions.push(notification.reactions[0]);
          // If any reaction is new, mark the group as new
          if (isNew) {
            acc[postId].isNew = true;
          }
        }
      } else {
        // Non-reaction notifications are kept as is
        acc[notification.id] = {
          ...notification,
          isNew,
        };
      }
      return acc;
    }, {});

    // Convert back to array and sort by most recent
    return Object.values(grouped).sort((a: any, b: any) => {
      const aTime = a.__typename === "ReactionNotification"
        ? a.reactions[0].reactions[0].reactedAt
        : a.timestamp;
      const bTime = b.__typename === "ReactionNotification"
        ? b.reactions[0].reactions[0].reactedAt
        : b.timestamp;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }, [notifs]);

  // Effect to check for new notifications and mark them
  useEffect(() => {
    if (!notifs.length) return;

    const lastSeenId = localStorage.getItem(LAST_SEEN_NOTIFICATION_KEY);
    const latestNotificationId = notifs[0]?.id;

    // If the latest notification is different from last seen, we have new notifications
    if (latestNotificationId && latestNotificationId !== lastSeenId) {
      console.log(`new latestNotificationId: ${latestNotificationId}`);
      setHasNewNotifications(true);
      // Immediately update the last seen ID
      localStorage.setItem(LAST_SEEN_NOTIFICATION_KEY, latestNotificationId);
    } else {
      setHasNewNotifications(false);
    }
  }, [notifs]);

  // Effect to clear new notifications indicator after 3 seconds when tooltip is shown
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (showTooltip && hasNewNotifications) {
      timeoutId = setTimeout(() => {
        setHasNewNotifications(false);
      }, 2000);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [showTooltip, hasNewNotifications]);

  // Effect to add and remove the event listener
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowTooltip(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowTooltip(false);
      }
    };

    // If the tooltip is visible, add the event listener
    if (showTooltip) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
    }

    // Cleanup function to remove the event listener
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showTooltip]);

  useEffect(() => {
    if (inView && hasNextPage && !isLoading && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage]);

  const handleTooltipToggle = (show: boolean) => {
    setShowTooltip(show);
    onShowChange?.(show);
  };

  if (!authenticatedProfileId || (!isLoading && notifs.length === 0)) return null;

  const isMobileBottomNav = isMobile && !openMobileMenu;

  // Define classes for the custom Button component when it's used
  const buttonBaseClasses = "!bg-none !border-none hover:!outline-none focus:!outline-none";
  let specificClassesForButtonComponent = "";
  if (openMobileMenu) { // For the expanded mobile menu item
    specificClassesForButtonComponent = "w-full text-base font-medium md:px-2 rounded-lg";
  } else { // For the desktop header icon (isMobileBottomNav is false, openMobileMenu is false)
    specificClassesForButtonComponent = "text-base font-medium md:px-2 rounded-lg";
  }
  const finalButtonClassNameForCustomButton = `${buttonBaseClasses} ${specificClassesForButtonComponent}`.trim();

  return (
    <div ref={containerRef} className="relative">
      {isMobileBottomNav ? (
        // Use a simple HTML button for the mobile bottom navbar icon
        <button
          type="button"
          className="p-0 bg-transparent border-none focus:outline-none appearance-none"
          onClick={() => handleTooltipToggle(!showTooltip)}
        >
          <div className="relative"> {/* Icon wrapper */}
            <NotificationsOutlined className={`h-6 w-6 ${showTooltip ? 'text-brand-highlight' : 'text-white'}`} />
            {hasNewNotifications && (
              <div className="absolute -top-3 -right-3 h-4 w-4 bg-bearish rounded-full" />
            )}
          </div>
        </button>
      ) : (
        // Use the custom Button component for other cases
        <Button
          size="md"
          className={finalButtonClassNameForCustomButton}
          onClick={() => handleTooltipToggle(!showTooltip)}
        >
          <div className="flex flex-row justify-center items-center">
            <div className="relative"> {/* Icon wrapper */}
              <NotificationsOutlined className={`${isMobile ? "h-6 w-6" : "h-5 w-5"} ${showTooltip ? 'text-brand-highlight' : 'text-white'}`} />
              {hasNewNotifications && (
                <div className="absolute -top-3 -right-3 h-4 w-4 bg-bearish rounded-full" />
              )}
            </div>
            {openMobileMenu && "Notifications"} {/* Text only if in expanded mobile menu */}
          </div>
        </Button>
      )}
      {showTooltip && containerRef.current && (
        <div className="fixed z-250" style={{
          top: isMobile
            ? `${containerRef.current.getBoundingClientRect().top - 8}px`
            : `${containerRef.current.getBoundingClientRect().bottom + 8}px`,
          right: isMobile ? '16px' : 'auto',
          left: isMobile ? 'auto' : `${containerRef.current.getBoundingClientRect().left}px`,
          transform: isMobile ? 'translateY(-100%)' : 'none',
          width: isMobile ? 'calc(100% - 32px)' : 'auto'
        }}>
          <div className={`bg-dark-grey text-white rounded-lg shadow-lg w-full md:w-[350px] max-h-[45vh] overflow-y-auto ${isMobile ? 'animate-ease-in' : ''}`}>
            <div className="sticky top-0 right-0 z-10 flex justify-end pt-2 pr-2 bg-dark-grey/80 backdrop-blur-sm">
              <button
                type="button"
                className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
                onClick={() => setShowTooltip(false)}
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {isLoading && (
              <div className="flex justify-center p-4"><Spinner customClasses="h-6 w-6" color="#5be39d" /></div>
            )}
            {groupedNotifications.map((notification, index) => (
              <NotificationItem
                key={notification.id}
                type={notification.__typename}
                notification={notification}
                showBorder={index !== groupedNotifications.length - 1}
                followed={followed}
                setFollowed={setFollowed}
                closeTooltip={() => setShowTooltip(false)}
              />
            ))}
            {hasNextPage && isFetchingNextPage && (
              <div ref={ref} className="flex justify-center pt-4">
                <Spinner customClasses="h-6 w-6" color="#5be39d" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

type NotificationType = "ReactionNotification" | "CommentNotification" | "collected"

interface NotificationItemProps {
  type: NotificationType
  notification: any
  showBorder: boolean
  followed: Record<string, boolean>;
  setFollowed: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  closeTooltip: () => void;
}

interface GroupedReactionNotificationProps {
  reactions: any[]
  postId: string
  postContent: string
  maxDisplayedAvatars?: number
  showBorder: boolean
  followed: Record<string, boolean>;
  setFollowed: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  closeTooltip: () => void;
  isNew?: boolean;
}

const GroupedReactionNotification = ({
  reactions,
  postId,
  postContent,
  maxDisplayedAvatars = 5,
  showBorder,
  followed,
  setFollowed,
  closeTooltip,
  isNew,
}: GroupedReactionNotificationProps) => {
  const displayedReactions = reactions.slice(0, maxDisplayedAvatars);
  const firstUser = reactions[0].account;

  if (!firstUser?.metadata) return null;

  return (
    <Link href={`/post/${postId}`} onClick={closeTooltip}>
      <div className={`py-3 px-4 flex gap-3 cursor-pointer transition-colors ${isNew ? 'bg-white/[0.05]' : 'hover:bg-white/[0.02]'}`}>
        {/* First Column - Icon */}
        <div className="flex-shrink-0 pt-1">
          <HeartIcon className="w-5 h-5 text-white" />
        </div>

        {/* Second Column - Content */}
        <div className="flex-1 flex flex-col gap-1.5">
          {/* Avatars row with overlap */}
          <div className="flex -space-x-2">
            {displayedReactions.map((reaction, index) => {
              const username = reaction.account?.username?.localName;
              const profile = reaction.account as Account;

              return (
                // Outer div for sizing and border
                <div
                  key={index}
                  className="h-8 w-8 border-2 border-dark-grey rounded-full overflow-hidden relative"
                >
                  <ProfilePopper profile={profile} followed={followed} setFollowed={setFollowed}>
                    {/* Link wraps only the image */}
                    <Link
                      href={username ? `/profile/${username}` : '#'}
                      onClick={(e) => {
                        if (!username) e.preventDefault();
                        e.stopPropagation();
                        closeTooltip();
                      }}
                      // Apply block and full size to the link to make the image clickable
                      className={`block w-full h-full ${username ? 'cursor-pointer' : 'cursor-default'}`}
                      aria-label={username ? `View profile ${username}` : "Profile image"}
                    >
                      {/* Image component */}
                      <Image
                        src={profile.metadata?.picture || "/default.png"}
                        alt={username || "profile"}
                        className="w-full h-full object-cover"
                        width={32}
                        height={32}
                      />
                    </Link>
                  </ProfilePopper>
                </div>
              );
            })}
          </div>

          {/* Action Text */}
          <p className="text-white text-sm">
            <span className="font-bold">{firstUser?.username?.localName}</span>
            {reactions.length > 1 && (
              <span> and {reactions.length - 1} others</span>
            )}
            <span className="font-normal"> liked your post</span>
          </p>

          {/* Post Content */}
          {postContent && (
            <p className="text-gray-300 text-sm">{getPostContentSubstring(postContent, 35)}</p>
          )}
        </div>
      </div>
      {showBorder && <div className="h-[1px] bg-[rgba(255,255,255,0.05)]" />}
    </Link>
  );
};

const NotificationItem = ({
  type,
  notification,
  showBorder,
  followed,
  setFollowed,
  closeTooltip,
}: NotificationItemProps) => {
  if (type === "ReactionNotification") {
    return (
      <GroupedReactionNotification
        reactions={notification.reactions}
        postId={notification.post.slug}
        postContent={notification.post.metadata.content}
        showBorder={showBorder}
        followed={followed}
        setFollowed={setFollowed}
        closeTooltip={closeTooltip}
        isNew={notification.isNew}
      />
    );
  }

  let profile: Account | null = null;
  let entity;
  let postId;
  let timestamp;
  let textContent;

  if (type === "CommentNotification") {
    entity = notification.comment as Post;
    profile = entity.author;
    postId = entity.operations.id.split("-")[0];
    timestamp = entity.timestamp;
    textContent = entity.metadata.content;
  }

  // TODO: handle collect notifs

  const username = profile?.username?.localName;

  const getIcon = () => {
    switch (type) {
      case "CommentNotification":
        return <ChatIcon className="w-5 h-5 text-white" />
      case "collected":
        return <BookmarkIcon className="w-5 h-5 text-white" />
      default:
        return <HeartIcon className="w-5 h-5 text-white" />
    }
  }

  const getActionText = () => {
    switch (type) {
      case "CommentNotification":
        return "commented on your post"
      case "collected":
        return "collected your post"
      default:
        return "interacted with your post"
    }
  }

  if (!["ReactionNotification", "CommentNotification", "collected"].includes(type)) {
    return null;
  }

  return (
    <Link href={postId ? `/post/${postId}` : '#'} className={!postId ? 'pointer-events-none' : ''} onClick={closeTooltip}>
      <div className={`py-3 px-4 flex gap-3 cursor-pointer transition-colors ${notification.isNew ? 'bg-white/[0.05]' : 'hover:bg-white/[0.02]'}`}>
        {/* First Column - Icon */}
        <div className="flex-shrink-0 pt-1">{getIcon()}</div>

        {/* Second Column - Content */}
        <div className="flex-1 flex flex-col gap-1.5">
          {/* First Row - Profile Picture */}
          {profile && (
            // Outer div for sizing and border
            <div className="h-8 w-8 border-2 border-dark-grey rounded-full overflow-hidden relative">
              <ProfilePopper profile={profile} followed={followed} setFollowed={setFollowed}>
                {/* Link wraps only the image */}
                <Link
                  href={username ? `/profile/${username}` : '#'}
                  onClick={(e) => {
                    if (!username) e.preventDefault();
                    e.stopPropagation();
                    closeTooltip();
                  }}
                  // Apply block and full size to the link to make the image clickable
                  className={`block w-full h-full ${username ? 'cursor-pointer' : 'cursor-default'}`}
                  aria-label={username ? `View profile ${username}` : "Profile image"}
                >
                  {/* Image component */}
                  <Image
                    src={profile.metadata?.picture || "/default.png"}
                    alt={"pfp"}
                    className="w-full h-full object-cover"
                    width={32}
                    height={32}
                  />
                </Link>
              </ProfilePopper>
            </div>
          )}

          {/* Second Row - Action Text */}
          <p className="text-white text-sm">
            <span className="font-bold">{username}</span>{" "}
            <span className="font-normal">{getActionText()}</span>
          </p>

          {/* Third Row - Post Content */}
          {textContent && (
            <p className="text-gray-300 text-sm">{getPostContentSubstring(textContent, 35)}</p>
          )}
        </div>
      </div>
      {showBorder && <div className="h-[1px] bg-[rgba(255,255,255,0.05)]" />}
    </Link>
  )
}
