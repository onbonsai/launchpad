import { css } from "@emotion/css";

export const publicationProfilePictureStyle = css`
  width: 36px;
  height: 36px;
  min-width: 36px;
  min-height: 36px;
  max-width: 36px;
  max-height: 36px;
  border-radius: 12px;
  object-fit: cover;
  background-color: #dddddd;
`;

export const textContainerStyleOverrides = css`
  padding-top: 20px;
  font-size: 16px;
  line-height: 20px;
  font-family: var(--font-inter), sans-serif;
`

export const mediaImageStyleOverride = css`
    width: calc(100% - 16px);
    height: auto;
    display: block;
    border-radius: 16px;
    object-fit: contain;
`

export const imageContainerStyleOverride = css`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  overflow: hidden;
  max-height: 480px;
  border-radius: 16px;
`

export const reactionsContainerStyleOverride = css`
  position: relative;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  margin-top: 12px;
  padding-bottom: 12px;
  margin-left: 12px;
  gap: 8px;
  cursor: default;
`

export const reactionContainerStyleOverride = (color, backgroundColor, isAuthenticatedAndWithHandler, hasReacted) => css`
  background-color: rgb(255,255,255,0.04);
  &:hover {
    background-color: ${isAuthenticatedAndWithHandler && !hasReacted ? backgroundColor : 'transparent'};
  }
  display: flex;
  border-radius: 10px;
  padding: 6px;
  p {
  display: flex;
    align-items: center;
    justify-content: center;
    color: ${color};
    background-color: rgb(255,255,255,0.04);
    font-size: 10px;
    margin: 0;
    margin-left: 4px;
    height: 14px;
    width: 14px;
    border-radius: 50%;
    font-weight: 500;
  }
  cursor: ${isAuthenticatedAndWithHandler && !hasReacted ? 'pointer' : 'default'};
`

export const publicationContainerStyleOverride = css`
  margin-bottom: 4px;
`

export const shareContainerStyleOverride = (color, backgroundColor) => css`
  background-color: rgb(255,255,255,0.08);
  &:hover {
    background-color: ${backgroundColor}
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
    opacity: .75;
    margin: 0;
    margin-left: 4px;
  }
  cursor: pointer;
`

export const actButtonContainerStyleOverride = (color, backgroundColor, disabled?: boolean) => css`
  background-color: rgb(255,255,255,0.08);
  &:hover {
    background-color: ${backgroundColor}
  }
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 10px;
  padding: 6px;
  right: 45px;
  top: 0px;
  height: 28px;
  width: 68px;
  p {
    color: ${color};
    font-size: 14px;
    opacity: .75;
    margin: 0;
  }
  cursor: ${!disabled ? 'pointer' : 'default'};
`