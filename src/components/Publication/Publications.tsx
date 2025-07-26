import { useEffect, useState } from "react";
import { css } from "@emotion/css";
import { Publication as PublicationComponent } from "./Publication";
import { Theme } from "./types";
import { PublicClient, Cursor } from "@lens-protocol/client";
import { getComments } from "@src/utils/publicationUtils";
import { getProfileByHandle } from "@src/services/lens/getProfiles";
import { getPostsByAuthor } from "@src/services/lens/posts";

// First, let's create a reusable CommentThread component to handle nested comments
const CommentThread = ({ comment, level = 0, maxDepth = 3, isLastComment = false, ...props }) => {
  const [expandedComments, setExpandedComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  async function fetchNestedComments(publicationId: string) {
    setLoadingComments(true);
    try {
      const lensClient = PublicClient.create({ environment: props.environment });
      const comments = await getComments(publicationId, lensClient);

      if (comments) {
        setExpandedComments(comments);
      }
    } catch (err) {
      console.log("error fetching nested comments: ", err);
    } finally {
      setLoadingComments(false);
    }
  }

  return (
    <div
      className={css`
        position: relative;
        padding-left: ${level > 0 ? "3rem" : "0"};
        margin-top: ${level > 0 ? "0.5rem" : "0"};
      `}
    >
      {/* Container for the thread lines */}
      {level > 0 && (
        <div
          className={css`
            position: absolute;
            left: 0;
            top: 0;
            width: 3rem;
            height: ${!isLastComment ? "calc(100% + 0.5rem)" : "auto"};
            pointer-events: none;

            /* The vertical thread line */
            &::before {
              content: "";
              position: absolute;
              left: 0.5rem;
              top: 0;
              height: ${!isLastComment ? "100%" : "0.65rem"};
              width: 2px;
              background-color: rgb(70, 70, 70);
            }

            /* The curved corner element */
            .corner {
              position: absolute;
              left: 0.5rem;
              top: 0;
              width: 1rem;
              height: 1.25rem;
              border-bottom: 2px solid rgb(70, 70, 70);
              border-left: 2px solid rgb(70, 70, 70);
              border-bottom-left-radius: 10px;
            }
          `}
        >
          <div className="corner"></div>
        </div>
      )}

      {/* Comment content */}
      <PublicationComponent
        {...props}
        publicationData={comment}
        publicationId={comment.id}
        hideCommentButton={level >= maxDepth}
        hideQuoteButton={true}
        hideShareButton={true}
        hideCollectButton={true}
        onCommentButtonClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (comment.author.username?.localName) {
            props.onCommentButtonClick?.(e, comment.id, comment.author.username.localName);
          }
          if (!expandedComments.length) {
            fetchNestedComments(comment.id);
          } else {
            setExpandedComments([]);
          }
        }}
      />

      {/* Loading spinner */}
      {loadingComments && (
        <div
          className={css`
            display: flex;
            justify-content: center;
            padding: 1rem 0;
          `}
        >
          <div
            className={css`
              animation: spin 1s linear infinite;
              border-radius: 9999px;
              height: 1.5rem;
              width: 1.5rem;
              border-bottom: 2px solid #4b5563;
              @keyframes spin {
                from {
                  transform: rotate(0deg);
                }
                to {
                  transform: rotate(360deg);
                }
              }
            `}
          />
        </div>
      )}

      {/* Nested comments */}
      {expandedComments.length > 0 && (
        <div
          className={css`
            margin-top: 0.5rem;
          `}
        >
          {expandedComments.map((nestedComment: any, index) => (
            <CommentThread
              key={nestedComment.id}
              comment={nestedComment}
              level={level + 1}
              maxDepth={maxDepth}
              isLastComment={index === expandedComments.length - 1}
              {...props}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export function Publications({
  profileId,
  handle,
  theme,
  numberOfPublications = 10,
  publications: initialPublications,
  environment,
  authenticatedProfile,
  hideFollowButton = true,
  hideCommentButton = false,
  hideQuoteButton = false,
  hideShareButton = false,
  hideCollectButton = false,
  onLikeButtonClick,
  onCommentButtonClick,
  hasUpvotedComment,
  getOperationsFor,
  onProfileClick,
  profilePictureStyleOverride,
  textContainerStyleOverride,
  containerBorderRadius,
  containerPadding,
  profilePadding,
  backgroundColorOverride,
  publicationContainerStyleOverride,
  markdownStyleBottomMargin,
  maxCommentDepth = 3, // Add this new prop
}: {
  profileId?: string;
  handle?: string;
  theme?: Theme;
  numberOfPublications?: number;
  publications?: any[];
  environment?: any;
  authenticatedProfile?: any;
  hideCommentButton?: boolean;
  hideQuoteButton?: boolean;
  hideShareButton?: boolean;
  hideCollectButton?: boolean;
  onLikeButtonClick?: (e, publicationId: string) => void;
  onCommentButtonClick?: (e, publicationId: string, username: string) => void;
  hasUpvotedComment: (publicationId: string) => boolean;
  getOperationsFor: (publicationId: string) => any;
  hideFollowButton?: boolean;
  onProfileClick?: (e, handleLocalName) => void;
  profilePictureStyleOverride?: string;
  textContainerStyleOverride?: string;
  containerBorderRadius?: string;
  containerPadding?: string;
  profilePadding?: string;
  backgroundColorOverride?: string;
  mediaImageStyleOverride?: string;
  imageContainerStyleOverride?: string;
  reactionsContainerStyleOverride?: string;
  reactionContainerStyleOverride?: (color, backgroundColor, isAuthenticatedAndWithHandler, hasReacted) => string;
  publicationContainerStyleOverride?: string;
  markdownStyleBottomMargin?: string;
  maxCommentDepth?: number;
}) {
  const [publications, setPublications] = useState<any[] | undefined>(initialPublications);
  const [expandedComments, setExpandedComments] = useState<{ [key: string]: any[] }>({});
  const [loadingComments, setLoadingComments] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (!initialPublications?.length) {
      fetchPublications();
    } else {
      setPublications(initialPublications);
    }
  }, [profileId, handle, initialPublications, numberOfPublications]);

  async function fetchPublications() {
    let id = profileId;

    if (!id && handle) {
      try {
        const profile = await getProfileByHandle(handle);
        id = profile?.address;
      } catch (err) {
        console.log("error fetching profile: ", err);
      }
    }

    if (!id) return;

    try {
      let allItems: any[] = [];
      let cursor: Cursor | null = null;
      const targetCount = numberOfPublications;

      while (allItems.length < targetCount) {
        const result = await getPostsByAuthor(id, cursor);

        if (result.isErr()) {
          throw result.error;
        }

        const { items, pageInfo } = result.value;
        allItems = [...allItems, ...items];

        if (!pageInfo.next || allItems.length >= targetCount) {
          break;
        }

        cursor = pageInfo.next as Cursor | null;
      }

      const finalItems = allItems.slice(0, targetCount);
      setPublications(finalItems);
    } catch (err) {
      console.log("error fetching publications: ", err);
    }
  }

  async function fetchComments(publicationId: string) {
    setLoadingComments((prev) => ({ ...prev, [publicationId]: true }));
    try {
      const lensClient = PublicClient.create({ environment });
      const comments = await getComments(publicationId, lensClient);

      if (comments) {
        setExpandedComments((prev) => ({
          ...prev,
          [publicationId]: comments,
        }));
      }
    } catch (err) {
      console.log("error fetching comments: ", err);
    } finally {
      setLoadingComments((prev) => ({ ...prev, [publicationId]: false }));
    }
  }

  // style overrides
  const activePublicationContainerStyle = publicationContainerStyleOverride || publicationContainerStyle;

  return (
    <div className={publicationsContainerStyle}>
      {publications?.map((_publication) => {
        const isThread = !!_publication.commentOn && _publication.commentOn.id !== _publication.root.id;
        const publication = isThread ? _publication?.commentOn : _publication;
        const hasExpandedComments = !!expandedComments[publication.id]?.length;
        const isLoadingComments = loadingComments[publication.id];

        return (
          <div key={`${publication.id}`} style={{ marginBottom: "12px" }}>
            <div className={activePublicationContainerStyle}>
              <PublicationComponent
                publicationData={publication}
                publicationId={publication.id}
                environment={environment}
                theme={theme}
                authenticatedProfile={authenticatedProfile}
                hideCommentButton={hideCommentButton}
                hideQuoteButton={hideQuoteButton}
                hideShareButton={hideShareButton}
                hideCollectButton={hideCollectButton}
                onLikeButtonClick={
                  onLikeButtonClick && !hasUpvotedComment(publication.id)
                    ? (e) => onLikeButtonClick(e, publication.id)
                    : undefined
                }
                operations={getOperationsFor(publication.id)}
                onProfileClick={onProfileClick}
                profilePictureStyleOverride={profilePictureStyleOverride}
                textContainerStyleOverride={textContainerStyleOverride}
                containerBorderRadius={containerBorderRadius}
                containerPadding={containerPadding}
                profilePadding={profilePadding}
                backgroundColorOverride={backgroundColorOverride}
                markdownStyleBottomMargin={markdownStyleBottomMargin}
                onCommentButtonClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (publication.author.username?.localName) {
                    onCommentButtonClick?.(e, publication.id, publication.author.username.localName);
                  }
                  if (!hasExpandedComments) {
                    fetchComments(publication.id);
                  } else {
                    setExpandedComments((prev) => {
                      const newState = { ...prev };
                      delete newState[publication.id];
                      return newState;
                    });
                  }
                }}
              />
            </div>

            {/* Comments section */}
            {isLoadingComments && (
              <div
                className={css`
                  display: flex;
                  justify-content: center;
                  padding-top: 1rem;
                  padding-bottom: 1rem;
                `}
              >
                <div
                  className={css`
                    animation: spin 1s linear infinite;
                    border-radius: 9999px;
                    height: 1.5rem;
                    width: 1.5rem;
                    border-bottom: 2px solid #4b5563;
                    @keyframes spin {
                      from {
                        transform: rotate(0deg);
                      }
                      to {
                        transform: rotate(360deg);
                      }
                    }
                  `}
                />
              </div>
            )}

            {(hasExpandedComments || isThread) && (
              <div>
                {(expandedComments[publication.id] || [_publication]).map((comment: any, index: number) => (
                  <CommentThread
                    key={comment.id}
                    comment={comment}
                    level={1}
                    maxDepth={maxCommentDepth}
                    operations={getOperationsFor(comment.id)}
                    getOperationsFor={getOperationsFor}
                    environment={environment}
                    theme={theme}
                    authenticatedProfile={authenticatedProfile}
                    onLikeButtonClick={onLikeButtonClick}
                    hasUpvotedComment={hasUpvotedComment}
                    hideFollowButton={hideFollowButton}
                    onProfileClick={onProfileClick}
                    profilePictureStyleOverride={profilePictureStyleOverride}
                    textContainerStyleOverride={textContainerStyleOverride}
                    containerBorderRadius={containerBorderRadius}
                    containerPadding={containerPadding}
                    profilePadding={profilePadding}
                    backgroundColorOverride={backgroundColorOverride}
                    markdownStyleBottomMargin={markdownStyleBottomMargin}
                    onCommentButtonClick={onCommentButtonClick}
                    isLastComment={!isThread ? index === expandedComments[publication.id].length - 1 : true}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const publicationsContainerStyle = css`
  @media (max-width: 510px) {
    width: 100%;
  }
`;

const publicationContainerStyle = css`
  margin-bottom: 12px;
`;
