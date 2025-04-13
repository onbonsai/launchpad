import { useState, useEffect, useRef, useMemo } from "react";
import { Header2, Subtitle } from "@src/styles/text";
import { BookmarkAddOutlined, ChatBubbleOutline, NotificationsOutlined, PersonOutlined } from "@mui/icons-material";
import { useWalletClient } from "wagmi";
import useLensSignIn from "@src/hooks/useLensSignIn";
import { useGetNotifications } from "@src/services/lens/getNotifications";
import Spinner from "../LoadingSpinner/LoadingSpinner";
import FavoriteIcon from '@mui/icons-material/Favorite';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import { HeartIcon } from "@heroicons/react/outline";
import { Button } from "../Button";
import { Account, Post } from "@lens-protocol/client";
import { getPostContentSubstring } from "@src/utils/utils";
import Link from "next/link";

export const Notifications = ({ openMobileMenu }: { openMobileMenu?: boolean }) => {
  const { data: walletClient } = useWalletClient();
  const { isAuthenticated } = useLensSignIn(walletClient);
  const { data, fetchNextPage, isFetchingNextPage, hasNextPage, isLoading } = useGetNotifications(isAuthenticated);
  const notifs = useMemo(() => data?.pages.flatMap(page => page.notifications) || [], [isLoading]);
  const [showTooltip, setShowTooltip] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // console.log(notifs);

  if (!isAuthenticated) return null;

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
          <div className="bg-dark-grey text-white rounded-lg shadow-lg w-full md:w-[350px]">
            {isLoading && (
              <div className="flex justify-center p-4"><Spinner customClasses="h-6 w-6" color="#5be39d" /></div>
            )}
            {notifs?.map((notification, index) => (
              <NotificationItem
                key={notification.id}
                type={notification.__typename}
                notification={notification}
                showBorder={index !== notifs.length - 1}
              />
            ))}
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
}

const NotificationItem = ({
  type,
  notification,
  showBorder,
}: NotificationItemProps) => {
  let profile: Account;
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
  } else if (type === "ReactionNotification") {
    // The first reaction in the array contains the user who reacted
    const reactionData = notification.reactions[0];
    profile = reactionData.account;
    postId = notification.post.id;
    timestamp = reactionData.reactions[0].reactedAt;
    textContent = notification.post.metadata.content;
  }

  // TODO: handle collect notifs

  const getIcon = () => {
    switch (type) {
      case "ReactionNotification":
        return <HeartIcon className="w-6 h-6 text-white" />
      case "CommentNotification":
        return <ChatBubbleOutline className="w-6 h-6 text-white" />
      case "collected":
        return <BookmarkAddOutlined className="w-6 h-6 text-white" />
      default:
        return <HeartIcon className="w-6 h-6 text-white" />
    }
  }

  const getActionText = () => {
    switch (type) {
      case "ReactionNotification":
        return "liked your post"
      case "CommentNotification":
        return "commented on your post"
      case "collected":
        return "collected your post"
      default:
        return "interacted with your post"
    }
  }

  return (
    <Link href={`/post/${postId}`}>
      <div className="py-4 px-4 flex gap-4 cursor-pointer transition-colors hover:bg-white/[0.02]">
        {/* First Column - Icon */}
        <div className="flex-shrink-0 pt-2">{getIcon()}</div>

        {/* Second Column - Content */}
        <div className="flex-1 flex flex-col gap-2">
          {/* First Row - Profile Picture */}
          <div className="h-10 w-10 border border-gray-700 rounded-full overflow-hidden">
            <img src={profile?.metadata?.picture || "/default.png"} alt={"pfp"} className="w-full h-full object-cover rounded-full" />
          </div>

          {/* Second Row - Action Text */}
          <p className="text-white">
            <span className="font-bold">{profile?.username?.localName}</span>{" "}
            <span className="font-normal">{getActionText()}</span>
          </p>

          {/* Third Row - Post Content */}
          {textContent && (
            <p className="text-gray-300">{getPostContentSubstring(textContent, 30)}</p>
          )}
        </div>
      </div>
      {showBorder && <div className="h-[1px] bg-[rgba(255,255,255,0.05)]" />}
    </Link>
  )
}
