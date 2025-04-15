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

export const Notifications = ({ openMobileMenu }: { openMobileMenu?: boolean }) => {
  const { ref, inView } = useInView();
  const { data: walletClient } = useWalletClient();
  const { authenticatedProfileId } = useLensSignIn(walletClient);
  const { data, fetchNextPage, isFetchingNextPage, hasNextPage, isLoading } = useGetNotifications(authenticatedProfileId);
  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const notifs = useMemo(() => data?.pages.flatMap(page => page.notifications) || [], [isLoading]);
  const [showTooltip, setShowTooltip] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Group notifications, combining reactions for the same post
  const groupedNotifications = useMemo(() => {
    const grouped = notifs.reduce((acc, notification) => {
      if (notification.__typename === "ReactionNotification") {
        const postId = notification.post.id;
        if (!acc[postId]) {
          // Create new grouped reaction notification
          acc[postId] = {
            id: `reaction-${postId}`,
            __typename: "ReactionNotification",
            post: notification.post,
            reactions: [notification.reactions[0]],
          };
        } else {
          // Add to existing group
          acc[postId].reactions.push(notification.reactions[0]);
        }
      } else {
        // Non-reaction notifications are kept as is
        acc[notification.id] = notification;
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

  if (!authenticatedProfileId || (!isLoading && notifs.length === 0)) return null;

  return (
    <div ref={containerRef} className="relative">
      <Button
        size="md"
        className={`text-base font-medium md:px-2 rounded-lg !bg-none !border-none ${!!openMobileMenu ? 'w-full' : ''} hover:!outline-none`}
        onClick={() => setShowTooltip(!showTooltip)}
      >
        <div className="flex flex-row justify-center items-center space-x-4">
          <NotificationsOutlined className="h-5 w-5 text-white" />
          {openMobileMenu ? "Notifications" : ""}
        </div>
      </Button>
      {showTooltip && containerRef.current && (
        <div className="fixed z-250" style={{
          top: containerRef.current.getBoundingClientRect().bottom + 8 + 'px',
          left: `${containerRef.current.getBoundingClientRect().left}px`
        }}>
          <div className="bg-dark-grey text-white rounded-lg shadow-lg w-full md:w-[350px] max-h-[45vh] overflow-y-auto">
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
}

interface GroupedReactionNotificationProps {
  reactions: any[]
  postId: string
  postContent: string
  maxDisplayedAvatars?: number
  showBorder: boolean
  followed: Record<string, boolean>;
  setFollowed: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

const GroupedReactionNotification = ({
  reactions,
  postId,
  postContent,
  maxDisplayedAvatars = 5,
  showBorder,
  followed,
  setFollowed
}: GroupedReactionNotificationProps) => {
  const displayedReactions = reactions.slice(0, maxDisplayedAvatars);
  const firstUser = reactions[0].account;

  if (!firstUser?.metadata) return null;

  return (
    <Link href={`/post/${postId}`}>
      <div className="py-3 px-4 flex gap-3 cursor-pointer transition-colors hover:bg-white/[0.02]">
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
                      }}
                      // Apply block and full size to the link to make the image clickable
                      className={`block w-full h-full ${username ? 'cursor-pointer' : 'cursor-default'}`}
                      aria-label={username ? `View profile ${username}` : "Profile image"}
                    >
                      {/* Image component */}
                      <img
                        src={profile.metadata?.picture || "/default.png"}
                        alt={username || "profile"}
                        className="w-full h-full object-cover"
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
}: NotificationItemProps) => {
  if (type === "ReactionNotification") {
    return (
      <GroupedReactionNotification
        reactions={notification.reactions}
        postId={notification.post.id}
        postContent={notification.post.metadata.content}
        showBorder={showBorder}
        followed={followed}
        setFollowed={setFollowed}
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
    <Link href={postId ? `/post/${postId}` : '#'} className={!postId ? 'pointer-events-none' : ''}>
      <div className="py-3 px-4 flex gap-3 cursor-pointer transition-colors hover:bg-white/[0.02]">
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
                  }}
                  // Apply block and full size to the link to make the image clickable
                  className={`block w-full h-full ${username ? 'cursor-pointer' : 'cursor-default'}`}
                  aria-label={username ? `View profile ${username}` : "Profile image"}
                >
                  {/* Image component */}
                  <img
                    src={profile.metadata?.picture || "/default.png"}
                    alt={"pfp"}
                    className="w-full h-full object-cover"
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
