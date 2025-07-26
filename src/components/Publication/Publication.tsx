import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { css } from "@emotion/css";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { Theme, ThemeColor } from "./types";
import { isEmpty } from "lodash/lang";
import { MirrorIcon, VideoCameraSlashIcon } from "../Icons";
import { formatHandleColors, getDisplayName, getSubstring, formatCustomDistance } from "@src/utils/publicationUtils";
import { formatCustomDate } from "@src/utils/utils";
import { AudioPlayer } from "./AudioPlayer";
import { NewHeartIcon } from "../Icons/NewHeartIcon";
import { NewMessageIcon } from "../Icons/NewMessageIcon";
import { NewShareIcon } from "../Icons/NewShareIcon";
import { NewColllectIcon } from "../Icons/NewCollectIcon";
import { EyeIcon } from "../Icons/EyeIcon";
import { PublicClient } from "@lens-protocol/client";
import { postId } from "@lens-protocol/client";
import { fetchPost } from "@lens-protocol/client/actions";
import { storageClient } from "@src/services/lens/client";
import Image from "next/image";

export function Publication({
  publicationId,
  onClick,
  onProfileClick,
  publicationData,
  theme = Theme.dark,
  fontSize,
  environment,
  authenticatedProfile,
  onCommentButtonClick,
  onMirrorButtonClick,
  onLikeButtonClick,
  onShareButtonClick,
  onCollectButtonClick,
  hideCommentButton = false,
  hideQuoteButton = false,
  hideShareButton = false,
  hideCollectButton = false,
  operations,
  profilePictureStyleOverride,
  textContainerStyleOverride,
  containerBorderRadius,
  containerPadding,
  profilePadding,
  backgroundColorOverride,
  markdownStyleBottomMargin,
  profileMaxWidth = "200px",
  usernameMaxWidth = "150px",
  fullVideoHeight = false,
  playVideo = true,
  hideVideoControls = false,
  presenceCount,
  layout = "vertical", // 'vertical' or 'horizontal'
  nestedWidget,
  updatedAt,
  hideProfile = false, // New prop to hide profile information
  disableAutoplay = false,
}: {
  publicationId?: string;
  publicationData?: any;
  onClick?: (e) => void;
  onProfileClick?: (e, handleLocalName) => void;
  theme?: Theme;
  fontSize?: string;
  environment?: any;
  authenticatedProfile?: any;
  onCommentButtonClick?: (e) => void;
  onMirrorButtonClick?: (e) => void;
  onLikeButtonClick?: (e, p) => void;
  onShareButtonClick?: (e) => void;
  onCollectButtonClick?: (e) => void;
  hideCommentButton?: boolean;
  hideQuoteButton?: boolean;
  hideShareButton?: boolean;
  hideCollectButton?: boolean;
  operations?: any;
  profilePictureStyleOverride?: string;
  textContainerStyleOverride?: string;
  containerBorderRadius?: string;
  containerPadding?: string;
  profilePadding?: string;
  backgroundColorOverride?: string;
  markdownStyleBottomMargin?: string;
  profileMaxWidth?: string;
  usernameMaxWidth?: string;
  fullVideoHeight?: boolean;
  playVideo?: boolean;
  hideVideoControls?: boolean;
  presenceCount?: number;
  layout?: "vertical" | "horizontal";
  nestedWidget?: ReactNode;
  updatedAt?: number;
  hideProfile?: boolean;
  disableAutoplay?: boolean;
}) {
  const [publication, setPublication] = useState<any>(publicationData);
  const [showFullText, setShowFullText] = useState(false);
  const [assetUrl, setAssetUrl] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const playCount = useRef(0);
  const [leftColumnHeight, setLeftColumnHeight] = useState<number>(0);
  const imageRef = useRef<HTMLImageElement | HTMLIFrameElement | null>(null);
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [videoLoading, setVideoLoading] = useState(true);

  const measureImageHeight = () => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    resizeTimeoutRef.current = setTimeout(() => {
      if (imageRef.current) {
        setLeftColumnHeight(imageRef.current.clientHeight);
      }
    }, 100);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    if (imageRef.current) {
      setLeftColumnHeight(imageRef.current.clientHeight);
    }
  };

  useEffect(() => {
    const handleResize = () => measureImageHeight();
    if (layout === "horizontal") {
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current);
        }
      };
    }
  }, [layout]);

  useEffect(() => {
    if (!publicationData) {
      fetchPublication();
    } else {
      setPublication(publicationData);
    }
  }, [publicationId]);

  useEffect(() => {
    if (videoRef.current) {
      if (playVideo) {
        videoRef.current.play().catch((error) => console.error("Video autoplay prevented: ", error));
      } else {
        videoRef.current.pause();
      }
    }
  }, [playVideo, assetUrl]);

  useEffect(() => {
    if (!publication) return;
    let isMounted = true;
    const resolveAssetUrl = async () => {
      try {
        if (publication.metadata.__typename === "ImageMetadata") {
          setImageLoading(true);
          const url = publication.metadata.image.item?.startsWith("lens://")
            ? await storageClient.resolve(publication.metadata.image.item)
            : publication.metadata.image.item;
          if (isMounted) setAssetUrl(url);
        } else if (publication.metadata.__typename === "VideoMetadata") {
          setVideoLoading(true);
          const url = publication.metadata.video.item?.startsWith("lens://")
            ? await storageClient.resolve(publication.metadata.video.item)
            : publication.metadata.video.item;
          if (isMounted) setAssetUrl(url);
        }
      } catch (error) {
        console.error("Error resolving asset URL:", error);
        if (isMounted) setAssetUrl("");
      }
    };
    resolveAssetUrl();
    return () => {
      isMounted = false;
    };
  }, [publication]);

  async function fetchPublication() {
    try {
      const lensClient = PublicClient.create({ environment });
      const result = await fetchPost(lensClient, { post: postId(publicationId!) });
      if (result.isErr()) {
        return console.error(result.error);
      }
      setPublication(result.value);
    } catch (err) {
      console.log("error fetching publication: ", err);
    }
  }

  function onPublicationPress(e) {
    onClick?.(e);
  }

  function onProfilePress(e) {
    if (publication.author.username?.localName) {
      onProfileClick?.(e, publication.author.username.localName);
    }
  }

  function onCommentPress(e) {
    onCommentButtonClick?.(e);
  }

  function onMirrorPress(e) {
    onMirrorButtonClick?.(e);
  }

  const handleEnded = () => {
    playCount.current += 1;
    if (playCount.current < 2) {
      try {
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          setIsPlaying(true);
        }
      } catch (error) {
        console.error("Error resetting video:", error);
      }
    } else {
      setIsPlaying(false);
    }
  };

  if (!publication) return null;

  const { isMirror } = useMemo(() => {
    if (publication.mirrorOf) {
      return { isMirror: true };
    }
    return { isMirror: false };
  }, [publication]);

  const { isDarkTheme, color, backgroundColor, reactionBgColor, reactionTextColor } = useMemo(() => {
    const isDarkTheme = theme === Theme.dark;
    const baseBackgroundColor = layout === "horizontal" ? "#191919" : ThemeColor.lightBlack;
    return {
      isDarkTheme,
      color: isDarkTheme ? ThemeColor.white : ThemeColor.darkGray,
      backgroundColor: backgroundColorOverride ?? (isDarkTheme ? baseBackgroundColor : ThemeColor.white),
      reactionBgColor: isDarkTheme ? ThemeColor.darkGray : ThemeColor.lightGray,
      reactionTextColor: isDarkTheme ? ThemeColor.lightGray : ThemeColor.darkGray,
    };
  }, [theme, layout, backgroundColorOverride]);

  const isAuthenticated = useMemo(() => !!authenticatedProfile?.address, [authenticatedProfile]);

  const canvasUrl = useMemo(() => {
    if (!publication?.metadata?.attributes) return null;
    const isCanvas = publication.metadata.attributes.find((attr: any) => attr.key === "isCanvas");
    if (!isCanvas) return null;
    if (isCanvas.value && (isCanvas.value.startsWith("http://") || isCanvas.value.startsWith("https://"))) {
      return isCanvas.value;
    }
    const apiUrl = publication.metadata.attributes.find((attr: any) => attr.key === "apiUrl");
    if (!apiUrl?.value) return null;
    return `${apiUrl.value}/post/${publication.id}/canvas`;
  }, [publication]);

  const activeProfilePictureStyle = useMemo(() => {
    const baseStyle = layout === "horizontal" ? horizontalProfilePictureStyle : profilePictureStyle;
    return profilePictureStyleOverride ?? baseStyle;
  }, [layout, profilePictureStyleOverride]);

  const reactions = (
    <div
      className={layout === "horizontal" ? horizontalReactionsContainerStyle : reactionsContainerStyle}
      onClick={onPublicationPress}
    >
      {!isEmpty(publication.stats) && (
        <>
          <div
            className={(layout === "horizontal" ? horizontalReactionContainerStyle : reactionContainerStyle)(
              reactionTextColor,
              reactionBgColor,
              isAuthenticated && onLikeButtonClick,
              operations?.hasUpvoted,
            )}
            onClick={(e) => onLikeButtonClick?.(e, publication)}
          >
            <NewHeartIcon
              fillColor={!operations?.hasUpvoted ? ThemeColor.transparent : ThemeColor.red}
              outlineColor={!operations?.hasUpvoted ? reactionTextColor : ThemeColor.red}
            />
            {publication.stats.upvotes > 0 && <p>{publication.stats.upvotes}</p>}
          </div>
          {!hideCommentButton && (
            <div
              className={(layout === "horizontal" ? horizontalReactionContainerStyle : reactionContainerStyle)(
                reactionTextColor,
                reactionBgColor,
                isAuthenticated && onCommentButtonClick && operations?.canComment,
                false,
              )}
              onClick={onCommentPress}
            >
              <NewMessageIcon color={reactionTextColor} />
              {publication.stats.comments > 0 && <p>{publication.stats.comments}</p>}
            </div>
          )}
          {!hideQuoteButton && (
            <div
              className={(layout === "horizontal" ? horizontalReactionContainerStyle : reactionContainerStyle)(
                reactionTextColor,
                reactionBgColor,
                isAuthenticated && onMirrorButtonClick,
                operations?.hasMirrored,
              )}
              onClick={onMirrorPress}
            >
              <MirrorIcon color={!operations?.hasMirrored ? reactionTextColor : ThemeColor.lightGreen} />
              {publication.stats.mirrors + publication.stats.quotes > 0 && (
                <p>{publication.stats.mirrors + publication.stats.quotes}</p>
              )}
            </div>
          )}
          {!hideCollectButton && (
            <div
              className={(layout === "horizontal" ? horizontalReactionContainerStyle : reactionContainerStyle)(
                reactionTextColor,
                reactionBgColor,
                isAuthenticated && onCollectButtonClick,
                operations?.hasCollected,
              )}
              onClick={onCollectButtonClick}
            >
              <NewColllectIcon
                fillColor={operations?.hasCollected ? reactionTextColor : ThemeColor.transparent}
                outlineColor={reactionTextColor}
              />
              {publication.stats.collects > 0 && <p>{publication.stats.collects}</p>}
            </div>
          )}
          {presenceCount && presenceCount > 1 && (
            <div className={reactionContainerStyle(reactionTextColor, reactionBgColor, false, false)}>
              <EyeIcon outlineColor={reactionTextColor} />
              <p>{presenceCount}</p>
            </div>
          )}
          {!hideShareButton && (
            <div
              className={(layout === "horizontal" ? horizontalShareContainerStyle : shareContainerStyle)(
                reactionTextColor,
                reactionBgColor,
              )}
              onClick={onShareButtonClick}
            >
              <NewShareIcon color={reactionTextColor} />
            </div>
          )}
        </>
      )}
    </div>
  );

  const media = (
    <>
      {canvasUrl ? (
        <div className={iframeContainerStyle}>
          {operations?.hasCollected ? (
            <>
              <iframe
                src={canvasUrl}
                className={iframeStyle}
                ref={imageRef as React.RefObject<HTMLIFrameElement>}
                onLoad={handleImageLoad}
              />
              <button
                className={fullscreenButtonStyle}
                onClick={() => {
                  const container = imageRef.current?.parentElement;
                  if (!container) return;
                  if (document.fullscreenElement) {
                    document.exitFullscreen();
                  } else {
                    container.requestFullscreen();
                  }
                }}
              >
                {document.fullscreenElement ? "Exit Fullscreen" : "Enter Fullscreen"}
              </button>
            </>
          ) : (
            <div className={collectMessageContainerStyle}>
              <p className={collectMessageStyle}>Collect this post to view the canvas</p>
            </div>
          )}
        </div>
      ) : (
        <>
          {publication.metadata?.__typename === "ImageMetadata" && (
            <div className={layout === "horizontal" ? horizontalImageContainerStyle : imageContainerStyle}>
              {imageLoading && assetUrl && (
                <div className={imageSkeletonStyle} />
              )}
              <img
                ref={imageRef as React.RefObject<HTMLImageElement>}
                onLoad={handleImageLoad}
                className={layout === "horizontal" ? horizontalMediaImageStyle : mediaImageStyle}
                src={assetUrl}
                onClick={onPublicationPress}
                alt="Publication Image"
                style={{ display: imageLoading ? 'none' : 'block' }}
              />
            </div>
          )}
          {(publication.metadata?.__typename === "VideoMetadata" ||
            publication.metadata?.__typename === "LiveStreamMetadata") && (
            <div
              className={layout === "horizontal" ? horizontalVideoContainerStyle : videoContainerStyle(fullVideoHeight)}
            >
              {videoLoading && assetUrl && (
                <div className={videoSkeletonStyle} />
              )}
              <video
                ref={videoRef}
                className={videoStyle}
                src={assetUrl}
                onLoadedMetadata={(e) => {
                  setVideoLoading(false);
                  measureImageHeight();
                }}
                onError={(e) => {
                  console.error("Video error:", e);
                  setIsPlaying(false);
                  setVideoLoading(false);
                }}
                controls={!hideVideoControls}
                controlsList="nodownload"
                playsInline
                muted
                autoPlay={isPlaying && !disableAutoplay}
                loop={isPlaying}
                onEnded={handleEnded}
                style={{ display: videoLoading ? 'none' : 'block' }}
              />
              {publication.metadata?.__typename === "LiveStreamMetadataV3" && (
                <div className={liveContainerStyle}>
                  <div className={liveDotStyle} />
                  LIVE
                </div>
              )}
              {publication.metadata?.__typename === "LiveStreamMetadataV3" && (
                <div className={endedContainerStyle}>
                  <VideoCameraSlashIcon color={reactionTextColor} />
                  <p>Stream Ended</p>
                </div>
              )}
            </div>
          )}
          {publication.metadata?.__typename === "AudioMetadata" && (
            <div className={audioContainerStyle}>
              <AudioPlayer
                url={assetUrl}
                theme={theme}
                cover={publication.metadata.audio.item?.cover}
                profile={publication.by}
              />
            </div>
          )}
        </>
      )}
    </>
  );

  const profileInfo = !hideProfile ? (
    <div className={profileContainerStyle(isMirror, profilePadding)}>
      <div className={onProfileClick ? "cursor-pointer" : "cursor-default"} onClick={onProfilePress}>
        <Image
          src={publication.author?.metadata?.picture || "/default.webp"}
          className={activeProfilePictureStyle}
          loading="eager"
          decoding="async"
          alt="Profile picture"
          width={36}
          height={36}
        />
      </div>
      <div className={profileDetailsContainerStyle(color)}>
        <div className={`flex ${!fullVideoHeight ? "items-center" : "items-center"} w-fit`}>
          <div className="flex items-center gap-x-2">
            <p onClick={onProfilePress} className={profileNameStyle(profileMaxWidth)}>
              {getDisplayName(publication.author)}
            </p>
            <p onClick={onProfilePress} className={usernameStyle(usernameMaxWidth)}>
              @{publication.author.username?.localName}
            </p>
          </div>
          <div className="flex items-center">
            <span className="mx-2 text-sm opacity-60">•</span>
            <p className={timestampStyle}>{formatCustomDate(publication.timestamp)}</p>
          </div>
          {updatedAt && (
            <>
              <div className="flex items-center">
                <span className="mx-2 text-sm opacity-60">•</span>
              </div>
              <p className={timestampStyle}>{`updated ${formatCustomDistance(updatedAt)} ago`}</p>
            </>
          )}
        </div>
      </div>
    </div>
  ) : null;

  const textContent = (
    <div className={textContainerStyleOverride ?? textContainerStyle}>
      <div className={markdownStyle(color, fontSize, markdownStyleBottomMargin)}>
        <ReactMarkdown rehypePlugins={[rehypeRaw]}>
          {showFullText
            ? formatHandleColors(publication.metadata.content)
            : formatHandleColors(getSubstring(publication.metadata.content, 250))}
        </ReactMarkdown>
      </div>
      {publication.metadata.content?.length > 250 && (
        <div style={{ display: "flex", marginRight: 5 }}>
          <button
            className={showMoreStyle}
            onClick={(e) => {
              e.stopPropagation();
              setShowFullText(!showFullText);
            }}
          >
            {showFullText ? "Show Less" : "Show More"}
          </button>
        </div>
      )}
    </div>
  );

  if (layout === "horizontal") {
    return (
      <div
        className={horizontalPublicationContainerStyle(backgroundColor, !!onClick)}
        style={{ minHeight: leftColumnHeight > 0 ? leftColumnHeight : "auto" }}
      >
        <div className={leftColumnStyle} ref={leftColumnRef}>
          {media}
          {reactions}
        </div>
        <div className={rightColumnStyle}>
          <div onClick={onPublicationPress} className={topLevelContentStyle()}>
            {profileInfo}
            {textContent}
            {nestedWidget}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={publicationContainerStyle(
        backgroundColor,
        !!onClick,
        containerBorderRadius,
        publication.metadata?.__typename === "VideoMetadata" ||
          publication.metadata?.__typename === "LiveStreamMetadata",
      )}
    >
      <div onClick={onPublicationPress} className={topLevelContentStyle(containerPadding)}>
        {profileInfo}
        {textContent}
      </div>
      <div>
        {media}
        {reactions}
      </div>
    </div>
  );
}

// ... existing styles, and add horizontal-specific styles

const showMoreStyle = css`
  color: ${ThemeColor.lightGreen};
  font-size: 14px;
  padding-top: 4px;
  padding-bottom: 4px;
  transition: opacity 0.2s ease;
  &:hover {
    opacity: 0.6;
  }
  margin-left: auto;
  display: block;
  font-family: inherit;
`;

const system = css`
  font-family: inherit !important;
`;

// Vertical Styles
const publicationContainerStyle = (color, onClick: boolean, containerBorderRadius?: string, isVideo = false) => css`
  width: 100%;
  min-width: 350px;
  background-color: ${color};
  cursor: ${onClick ? "pointer" : "default"};
  border-radius: ${containerBorderRadius ?? "18px"};
  @media (max-width: 510px) {
    width: 100%;
    min-width: unset;
    max-width: 510px;
  }
  * {
    ${system};
  }
`;

const topLevelContentStyle = (padding?: string) => css`
  padding: ${padding ?? "12px 18px 0px"};
`;

const textContainerStyle = css`
  padding-top: 22px;
`;

const profileContainerStyle = (isMirror, padding?: string) => css`
  display: flex;
  align-items: center;
  padding: ${padding ?? (isMirror ? "2px 0 0 0" : "6px 0 0 0")};
`;

const profilePictureStyle = css`
  width: 42px;
  height: 42px;
  min-width: 42px;
  min-height: 42px;
  max-width: 42px;
  max-height: 42px;
  border-radius: 20px;
  object-fit: cover;
  background-color: #dddddd;
  transform: translateZ(0);
`;

const imageContainerStyle = css`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  overflow: hidden;
  max-height: 480px;
  min-height: 200px;
  margin-top: 14px;
  background-color: rgba(255, 255, 255, 0.05);
`;

const mediaImageStyle = css`
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  max-height: 100%;
`;

const videoContainerStyle = (fullVideoHeight: boolean = false) => css`
  position: relative;
  width: 100%;
  min-height: ${fullVideoHeight ? "200px" : "200px"};
  max-height: ${fullVideoHeight ? "none" : "80vh"};
  background-color: black;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

const videoStyle = css`
  display: block;
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
`;

const audioContainerStyle = css`
  margin-top: 14px;
`;

const reactionsContainerStyle = css`
  position: relative;
  padding: 0px 18px 18px;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  margin-top: 15px;
  gap: 10px;
  cursor: default;
`;

const reactionContainerStyle = (color, backgroundColor, isAuthenticatedAndWithHandler, hasReacted) => css`
  background-color: transparent;
  &:hover {
    background-color: ${isAuthenticatedAndWithHandler && !hasReacted ? backgroundColor : "transparent"};
  }
  display: flex;
  border-radius: 24px;
  padding: 12px 16px 10px 16px;
  margin-right: 10px;
  p {
    color: ${color};
    font-size: 12px;
    opacity: 0.75;
    margin: 0;
    margin-left: 4px;
  }
  cursor: ${isAuthenticatedAndWithHandler && !hasReacted ? "pointer" : "default"};
`;

const shareContainerStyle = (color, backgroundColor) => css`
  background-color: transparent;
  &:hover {
    background-color: ${backgroundColor};
  }
  display: flex;
  border-radius: 24px;
  padding: 12px 16px 10px 16px;
  margin-right: 10px;
  position: absolute;
  right: 5px;
  top: 0px;
  p {
    color: ${color};
    font-size: 12px;
    opacity: 0.75;
    margin: 0;
    margin-left: 4px;
  }
  cursor: pointer;
`;

// Horizontal Styles

const horizontalPublicationContainerStyle = (backgroundColor: string, hasClick: boolean) => css`
  width: 100%;
  background-color: ${backgroundColor};
  display: flex;
  flex-direction: row;
  overflow: hidden;
  margin-bottom: 4px;
  border-radius: 24px;
  font-family: inherit;
  ${hasClick ? "cursor: pointer;" : ""}
`;

const leftColumnStyle = css`
  flex: 0 0 auto;
  width: 50%;
  max-width: 50%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: auto;
  position: relative;
  overflow: hidden;
  padding: 0;
`;

const rightColumnStyle = css`
  flex: 1;
  overflow-y: auto;
  margin-left: 6px;
`;

const horizontalImageContainerStyle = css`
  position: relative;
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  width: 100%;
  height: auto;
  min-height: 200px;
  overflow: hidden;
  border-radius: 16px;
  margin-top: 0;
  background-color: rgba(255, 255, 255, 0.05);
`;

const horizontalMediaImageStyle = css`
  width: 100%;
  height: auto;
  max-height: 100%;
  display: block;
  border-radius: 16px;
  object-fit: contain;
`;

const horizontalVideoContainerStyle = css`
  position: relative !important;
  margin-top: 0;
  width: 100%;
  height: auto;
  min-height: 200px;
  max-height: 720px;
  background-color: black;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

const horizontalReactionsContainerStyle = css`
  position: relative;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  margin-top: 12px;
  padding-bottom: 12px;
  padding-left: 12px;
  gap: 8px;
  cursor: default;
`;

const horizontalReactionContainerStyle = (color, backgroundColor, isAuthenticatedAndWithHandler, hasReacted) => css`
  background-color: rgba(255, 255, 255, 0.04);
  &:hover {
    background-color: ${isAuthenticatedAndWithHandler && !hasReacted ? backgroundColor : "transparent"};
  }
  display: flex;
  border-radius: 10px;
  padding: 6px;
  p {
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${color};
    background-color: rgba(255, 255, 255, 0.04);
    font-size: 10px;
    margin: 0;
    margin-left: 4px;
    height: 14px;
    width: 14px;
    border-radius: 50%;
    font-weight: 500;
  }
  cursor: ${isAuthenticatedAndWithHandler && !hasReacted ? "pointer" : "default"};
`;

const horizontalShareContainerStyle = (color, backgroundColor) => css`
  background-color: rgba(255, 255, 255, 0.08);
  &:hover {
    background-color: ${backgroundColor};
  }
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 10px;
  padding: 6px;
  margin-right: 4px;
  position: absolute;
  right: 5px;
  top: 0px;
  height: 24px;
  width: 24px;
  p {
    color: ${color};
    font-size: 12px;
    opacity: 0.75;
    margin: 0;
    margin-left: 4px;
  }
  cursor: pointer;
`;

const horizontalProfilePictureStyle = css`
  width: 36px;
  height: 36px;
  border-radius: 12px;
  object-fit: cover;
  background-color: #dddddd;
`;

const markdownStyle = (color, fontSize, bottomMargin?: string) => css`
  color: ${color};
  overflow: hidden;
  li {
    font-size: ${fontSize || "16px"};
  }
  p {
    font-size: ${fontSize || "16px"};
    margin-bottom: ${bottomMargin ?? "5px"};
    font-weight: ${bottomMargin === "0px" ? "300" : "normal"};
  }
`;

const profileDetailsContainerStyle = (color) => css`
  display: flex;
  flex-direction: column;
  margin-left: 10px;
  font-family: inherit;
  p {
    margin: 0;
    color: ${color};
    font-family: inherit;
  }
`;

const profileNameStyle = (profileMaxWidth) => css`
  font-weight: 600;
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: ${profileMaxWidth};
`;

const usernameStyle = (usernameMaxWidth) => css`
  opacity: 0.6;
  font-size: 14px;
  color: inherit;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: ${usernameMaxWidth};
`;

const timestampStyle = css`
  opacity: 0.6;
  flex-grow: 1;
  font-size: 14px;
  color: inherit;
`;

// Common styles for both layouts
const iframeContainerStyle = css`
  position: relative;
  width: 100%;
  height: auto;
  aspect-ratio: 1 / 1;
  margin-top: 0;
  border-radius: 16px;
  overflow: hidden;
`;

const iframeStyle = css`
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 16px;
`;

const liveContainerStyle = css`
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
  display: flex;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.25);
  padding: 5px 10px;
  border-radius: 5px;
  color: white;
  font-weight: bold;
`;

const liveDotStyle = css`
  width: 10px;
  height: 10px;
  background-color: red;
  border-radius: 50%;
  margin-right: 5px;
  animation: flash 3s linear infinite;
  @keyframes flash {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0.25;
    }
    100% {
      opacity: 1;
    }
  }
`;

const endedContainerStyle = css`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.25);
  padding: 5px 10px;
  border-radius: 5px;
  color: white;
  font-weight: bold;
  gap: 5px;
`;

const collectMessageContainerStyle = css`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-family: inherit;
`;

const collectMessageStyle = css`
  color: ${ThemeColor.darkGray};
  font-size: 18px;
  font-style: italic;
  font-weight: 500;
  font-family: inherit;
`;

const fullscreenButtonStyle = css`
  position: absolute;
  bottom: 16px;
  right: 16px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.2s ease;
  &:hover {
    background-color: rgba(0, 0, 0, 0.7);
  }
  z-index: 10;
`;

const imageSkeletonStyle = css`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
`;

const videoSkeletonStyle = css`
  width: 100%;
  height: 400px;
`;
