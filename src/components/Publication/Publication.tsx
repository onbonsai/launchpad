import { css } from "@emotion/css";
import { postId, PublicClient } from "@lens-protocol/client";
import { fetchPost } from "@lens-protocol/client/actions";
import { isEmpty } from "lodash/lang";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { WalletClient } from "viem";
import { AudioPlayer } from "./AudioPlayer";
import { HeartIcon, MessageIcon, MirrorIcon, ShareIcon, VideoCameraSlashIcon } from "../Icons";
import { EyeIcon } from "../Icons/EyeIcon";
import { NewColllectIcon } from "../Icons/NewCollectIcon";
import { NewHeartIcon } from "../Icons/NewHeartIcon";
import { NewMessageIcon } from "../Icons/NewMessageIcon";
import { NewShareIcon } from "../Icons/NewShareIcon";
import { Theme, ThemeColor } from "./types";
import { formatHandleColors, getDisplayName, getSubstring } from "@src/utils/publicationUtils";
import { formatCustomDate } from "@src/utils/utils";
import { Toast } from "react-hot-toast";
import { storageClient } from "@src/services/lens/client";

export function Publication({
  publicationId,
  onClick,
  onProfileClick,
  publicationData,
  theme = Theme.dark,
  ipfsGateway,
  fontSize,
  environment,
  authenticatedProfile,
  walletClient,
  onCommentButtonClick,
  onMirrorButtonClick,
  onLikeButtonClick,
  onShareButtonClick,
  onCollectButtonClick,
  hideFollowButton = true,
  hideCommentButton = false,
  hideQuoteButton = false,
  hideShareButton = false,
  hideCollectButton = false,
  followButtonDisabled = false,
  followButtonBackgroundColor,
  operations,
  useToast,
  rpcURLs,
  appDomainWhitelistedGasless,
  renderMadFiBadge = false,
  handlePinMetadata,
  isFollowed = false,
  onFollowPress,
  profilePictureStyleOverride,
  profileContainerStyleOverride,
  textContainerStyleOverride,
  containerBorderRadius,
  containerPadding,
  profilePadding,
  backgroundColorOverride,
  mediaImageStyleOverride,
  imageContainerStyleOverride,
  reactionsContainerStyleOverride,
  reactionContainerStyleOverride,
  markdownStyleBottomMargin,
  shareContainerStyleOverride,
  profileNameStyleOverride,
  dateNameStyleOverride,
  heartIconOverride,
  messageIconOverride,
  shareIconOverride,
  profileMaxWidth = "200px",
  usernameMaxWidth = "150px",
  fullVideoHeight = false,
  playVideo = true,
  hideVideoControls = false,
  presenceCount,
}: {
  publicationId?: string;
  publicationData?: any;
  onClick?: (e) => void;
  onProfileClick?: (e, handleLocalName) => void;
  theme?: Theme;
  ipfsGateway?: string;
  fontSize?: string;
  environment?: any;
  authenticatedProfile?: any;
  walletClient?: WalletClient;
  onCommentButtonClick?: (e) => void;
  onMirrorButtonClick?: (e) => void;
  onLikeButtonClick?: (e, p) => void;
  onShareButtonClick?: (e) => void;
  onCollectButtonClick?: (e) => void;
  hideFollowButton?: boolean;
  hideCommentButton?: boolean;
  hideQuoteButton?: boolean;
  hideShareButton?: boolean;
  hideCollectButton?: boolean;
  followButtonDisabled: boolean;
  followButtonBackgroundColor?: string;
  operations?: any;
  useToast?: Toast;
  rpcURLs?: { [chainId: number]: string };
  appDomainWhitelistedGasless?: boolean;
  renderMadFiBadge?: boolean;
  handlePinMetadata?: (content: string, files: any[]) => Promise<string>;
  isFollowed?: boolean;
  onFollowPress?: (event, profileId) => void;
  profilePictureStyleOverride?: string;
  profileContainerStyleOverride?: (isMirror, padding?: string) => string;
  textContainerStyleOverride?: string;
  containerBorderRadius?: string;
  containerPadding?: string;
  profilePadding?: string;
  backgroundColorOverride?: string;
  mediaImageStyleOverride?: string;
  imageContainerStyleOverride?: string;
  reactionsContainerStyleOverride?: string;
  reactionContainerStyleOverride?: (color, backgroundColor, isAuthenticatedAndWithHandler, hasReacted) => string;
  markdownStyleBottomMargin?: string;
  profileNameStyleOverride?: string;
  dateNameStyleOverride?: string;
  shareContainerStyleOverride?: (color, backgroundColor) => string;
  heartIconOverride?: boolean;
  messageIconOverride?: boolean;
  shareIconOverride?: boolean;
  profileMaxWidth?: string;
  usernameMaxWidth?: string;
  fullVideoHeight?: boolean;
  playVideo?: boolean;
  hideVideoControls?: boolean;
  presenceCount?: number;
}) {
  let [publication, setPublication] = useState<any>(publicationData);
  let [showFullText, setShowFullText] = useState(false);
  const [assetUrl, setAssetUrl] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);

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
        videoRef.current.play().catch((error) => {
          console.error("Video autoplay prevented: ", error);
        });
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
          const url = publication.metadata.image.item?.startsWith("lens://")
            ? await storageClient.resolve(publication.metadata.image.item)
            : publication.metadata.image.item;
          if (isMounted) {
            setAssetUrl(url);
          }
        } else if (publication.metadata.__typename === "VideoMetadata") {
          const url = publication.metadata.video.item?.startsWith("lens://")
            ? await storageClient.resolve(publication.metadata.video.item)
            : publication.metadata.video.item;
          if (isMounted) {
            setAssetUrl(url);
          }
        }
      } catch (error) {
        console.error("Error resolving asset URL:", error);
        if (isMounted) {
          setAssetUrl("");
        }
      }
    };

    resolveAssetUrl();

    return () => {
      isMounted = false;
    };
  }, [publication]);

  async function fetchPublication() {
    try {
      const lensClient = PublicClient.create({
        environment,
      });
      const result = await fetchPost(lensClient, {
        post: postId(publicationId!),
      });
      if (result.isErr()) {
        return console.error(result.error);
      }
      setPublication(result.value);
    } catch (err) {
      console.log("error fetching publication: ", err);
    }
  }

  function onPublicationPress(e) {
    if (onClick) {
      onClick(e);
    }
  }

  function onProfilePress(e) {
    if (onProfileClick && publication.author.username?.localName) {
      onProfileClick(e, publication.author.username.localName);
    }
  }

  function onCommentPress(e) {
    if (onCommentButtonClick) {
      onCommentButtonClick(e);
    }
  }

  function onMirrorPress(e) {
    if (onMirrorButtonClick) {
      onMirrorButtonClick(e);
    }
  }

  if (!publication) return null;

  const { isMirror, processedPublication } = useMemo(() => {
    if (publication.mirrorOf) {
      const { mirrorOf, ...original } = publication;
      const processed = { ...mirrorOf, original };
      return { isMirror: true, processedPublication: processed };
    }
    return { isMirror: false, processedPublication: publication };
  }, [publication]);

  // theming
  const isDarkTheme = useMemo(() => theme === Theme.dark, [theme]);
  const color = useMemo(() => (isDarkTheme ? ThemeColor.white : ThemeColor.darkGray), [isDarkTheme]);
  const backgroundColor = useMemo(
    () => backgroundColorOverride ?? (isDarkTheme ? ThemeColor.lightBlack : ThemeColor.white),
    [backgroundColorOverride, isDarkTheme],
  );
  const reactionBgColor = useMemo(() => (isDarkTheme ? ThemeColor.darkGray : ThemeColor.lightGray), [isDarkTheme]);
  const reactionTextColor = useMemo(() => (isDarkTheme ? ThemeColor.lightGray : ThemeColor.darkGray), [isDarkTheme]);

  // style overrides
  const activeProfilePictureStyle = useMemo(
    () => profilePictureStyleOverride ?? profilePictureStyle,
    [profilePictureStyleOverride],
  );
  const activeProfileContainerStyle = useMemo(
    () => profileContainerStyleOverride ?? profileContainerStyle,
    [profileContainerStyleOverride],
  );
  const activeTextContainerStyle = useMemo(
    () => textContainerStyleOverride ?? textContainerStyle,
    [textContainerStyleOverride],
  );
  const activeMediaImageStyle = useMemo(() => mediaImageStyleOverride ?? mediaImageStyle, [mediaImageStyleOverride]);
  const activeImageContainerStyle = useMemo(
    () => imageContainerStyleOverride ?? imageContainerStyle,
    [imageContainerStyleOverride],
  );
  const activeReactionsContainerStyle = useMemo(
    () => reactionsContainerStyleOverride ?? reactionsContainerStyle,
    [reactionsContainerStyleOverride],
  );
  const activeReactionContainerStyle = useMemo(
    () => reactionContainerStyleOverride ?? reactionContainerStyle,
    [reactionContainerStyleOverride],
  );
  const activeShareContainerStyle = useMemo(
    () => shareContainerStyleOverride ?? shareContainerStyle,
    [shareContainerStyleOverride],
  );

  // misc
  const isAuthenticated = useMemo(() => !!authenticatedProfile?.address, [authenticatedProfile]);

  return (
    <div
      className={publicationContainerStyle(
        backgroundColor,
        onClick ? true : false,
        containerBorderRadius,
        publication.metadata?.__typename === "VideoMetadata" ||
          publication.metadata?.__typename === "LiveStreamMetadata",
      )}
    >
      <div onClick={onPublicationPress} className={topLevelContentStyle(containerPadding)}>
        <div className={activeProfileContainerStyle(isMirror, profilePadding)}>
          <div className={onProfileClick ? "cursor-pointer" : "cursor-default"} onClick={onProfilePress}>
            <img
              src={publication.author?.metadata?.picture || "/default.png"}
              className={activeProfilePictureStyle}
              loading="eager"
              decoding="async"
              alt="Profile picture"
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
            </div>
          </div>
        </div>
        <div className={activeTextContainerStyle}>
          <div className={markdownStyle(color, fontSize, markdownStyleBottomMargin)}>
            <ReactMarkdown rehypePlugins={[rehypeRaw]}>
              {showFullText
                ? formatHandleColors(publication.metadata.content)
                : formatHandleColors(getSubstring(publication.metadata.content, 250))}
            </ReactMarkdown>
          </div>
          {publication.metadata.content.length > 250 && (
            <div style={{ display: "flex", marginRight: 5 }}>
              <button
                className={showMoreStyle}
                onClick={(event) => {
                  event.stopPropagation();
                  setShowFullText(!showFullText);
                }}
              >
                {showFullText ? "Show Less" : "Show More"}
              </button>
            </div>
          )}
        </div>
      </div>
      <div>
        {publication.metadata?.__typename === "ImageMetadata" && (
          <div className={activeImageContainerStyle}>
            <img className={activeMediaImageStyle} src={assetUrl} onClick={onPublicationPress} />
          </div>
        )}
        {(publication.metadata?.__typename === "VideoMetadata" ||
          publication.metadata?.__typename === "LiveStreamMetadata") && (
          <div className={videoContainerStyle(fullVideoHeight)}>
            <video
              ref={videoRef}
              src={assetUrl}
              controls={!hideVideoControls}
              controlsList="nodownload"
              muted
              autoPlay={playVideo}
              loop={playVideo}
              className={videoStyle}
              crossOrigin="anonymous"
              playsInline
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
        <div className={activeReactionsContainerStyle} onClick={onPublicationPress}>
          {!isEmpty(publication.stats) && (
            <>
              <div
                className={activeReactionContainerStyle(
                  reactionTextColor,
                  reactionBgColor,
                  isAuthenticated && onLikeButtonClick,
                  operations?.hasUpvoted,
                )}
                onClick={(e) => {
                  if (onLikeButtonClick) onLikeButtonClick(e, publication);
                }}
              >
                {heartIconOverride ? (
                  <NewHeartIcon
                    fillColor={!operations?.hasUpvoted ? ThemeColor.transparent : ThemeColor.red}
                    outlineColor={!operations?.hasUpvoted ? reactionTextColor : ThemeColor.red}
                  />
                ) : (
                  <HeartIcon color={!operations?.hasUpvoted ? reactionTextColor : ThemeColor.red} />
                )}
                {publication.stats.upvotes > 0 && (
                  <p>{publication.stats.upvotes > 0 ? publication.stats.upvotes : null}</p>
                )}
              </div>
              {!hideCommentButton && (
                <div
                  className={activeReactionContainerStyle(
                    reactionTextColor,
                    reactionBgColor,
                    isAuthenticated && onCommentButtonClick && operations?.canComment,
                    false,
                  )}
                  onClick={onCommentPress}
                >
                  {messageIconOverride ? (
                    <NewMessageIcon color={reactionTextColor} />
                  ) : (
                    <MessageIcon color={reactionTextColor} />
                  )}
                  {publication.stats.comments > 0 && (
                    <p>{publication.stats.comments > 0 ? publication.stats.comments : null}</p>
                  )}
                </div>
              )}
              {!hideQuoteButton && (
                <div
                  className={activeReactionContainerStyle(
                    reactionTextColor,
                    reactionBgColor,
                    isAuthenticated && onMirrorButtonClick,
                    operations?.hasMirrored,
                  )}
                  onClick={onMirrorPress}
                >
                  <MirrorIcon color={!operations?.hasMirrored ? reactionTextColor : ThemeColor.lightGreen} />
                  {publication.stats.mirrors + publication.stats.quotes > 0 ? (
                    <p>{publication.stats.mirrors + publication.stats.quotes}</p>
                  ) : null}
                </div>
              )}
              {!hideCollectButton && (
                <div
                  className={activeReactionContainerStyle(
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
                  {publication.stats.collects > 0 ? <p>{publication.stats.collects}</p> : null}
                </div>
              )}
              {presenceCount && presenceCount > 1 ? (
                <div className={reactionContainerStyle(reactionTextColor, reactionBgColor, false, false)}>
                  <EyeIcon outlineColor={reactionTextColor} />
                  <p>{presenceCount}</p>
                </div>
              ) : null}
              {!hideShareButton && (
                <div
                  className={activeShareContainerStyle(reactionTextColor, reactionBgColor)}
                  onClick={onShareButtonClick}
                >
                  {shareIconOverride ? (
                    <NewShareIcon color={reactionTextColor} />
                  ) : (
                    <ShareIcon color={reactionTextColor} />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const showMoreStyle = css`
  color: ${ThemeColor.lightGreen};
  font-size: 14px;
  padding-top: 4px;
  transition: opacity 0.2s ease;
  &:hover {
    opacity: 0.6;
  }
  margin-left: auto;
  display: block;
`;

const textContainerStyle = css`
  padding-top: 22px;
`;

const topLevelContentStyle = (padding?: string) => css`
  padding: ${padding ?? "12px 18px 0px"};
`;

const imageContainerStyle = css`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  overflow: hidden;
  max-height: 480px;
  margin-top: 14px;
`;

const videoContainerStyle = (fullVideoHeight: boolean = false) => css`
  position: relative;
  width: 100%;
  height: ${fullVideoHeight ? "auto" : "480px"};
  background-color: black;
`;

const audioContainerStyle = css`
  margin-top: 14px;
`;

const videoStyle = css`
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;
const mediaImageStyle = css`
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  max-height: 100%;
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
  }
`;

const profileContainerStyle = (isMirror, padding?: string) => css`
  display: flex;
  align-items: center;
  padding: ${padding ?? (isMirror ? "2px 0 0 0" : "6px 0 0 0")};
`;
const system = css`
  font-family: inherit !important;
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
  will-change: auto;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  -webkit-transform: translateZ(0);
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
  gap: 5px; // Adjust as needed for space between icon and text
`;

const timestampStyle = css`
  opacity: 0.6;
  flex-grow: 1;
  font-size: 14px;
  color: inherit;
`;
