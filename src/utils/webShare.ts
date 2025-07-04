/**
 * Web Share API utility for Bonsai PWA
 * Provides native sharing capabilities with fallback to clipboard
 */

import { haptics } from './haptics';
import toast from 'react-hot-toast';

interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

interface ShareMetadata {
  title: string;
  text: string;
  url: string;
  image?: string;
  hashtags?: string[];
}

export class WebShareManager {
  /**
   * Check if Web Share API is supported
   */
  static isSupported(): boolean {
    return 'share' in navigator;
  }

  /**
   * Check if app is running as PWA
   */
  static isPWA(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches || 
           (window.navigator as any).standalone === true ||
           document.referrer.includes('android-app://');
  }

  /**
   * Check if file sharing is supported
   */
  static canShareFiles(): boolean {
    return 'canShare' in navigator && 'files' in navigator;
  }

  /**
   * Share content using native share sheet (only in PWA) or fallback to clipboard
   */
  static async share(data: ShareData): Promise<boolean> {
    try {
      // Only use Web Share API if running as PWA AND API is supported
      if (this.isPWA() && this.isSupported()) {
        await navigator.share(data);
        haptics.light();
        return true;
      } else {
        // Fallback to clipboard for browser mode or unsupported devices
        if (data.url) {
          await navigator.clipboard.writeText(data.url);
          toast.success('Link copied to clipboard!', { 
            position: 'bottom-center', 
            duration: 2000 
          });
          haptics.success();
          return true;
        } else if (data.text) {
          await navigator.clipboard.writeText(data.text);
          toast.success('Text copied to clipboard!', { 
            position: 'bottom-center', 
            duration: 2000 
          });
          haptics.success();
          return true;
        }
        return false;
      }
    } catch (error) {
      // User cancelled or error occurred
      if (error instanceof Error && error.name === 'AbortError') {
        // User cancelled, don't show error
        return false;
      }
      
      console.error('Share failed:', error);
      
      // Fallback to clipboard on any error
      try {
        const textToShare = data.url || data.text || '';
        if (textToShare) {
          await navigator.clipboard.writeText(textToShare);
          toast.success('Link copied to clipboard!', { 
            position: 'bottom-center', 
            duration: 2000 
          });
          haptics.success();
          return true;
        }
      } catch (clipboardError) {
        console.error('Clipboard fallback failed:', clipboardError);
        toast.error('Sharing failed');
        haptics.error();
      }
      
      return false;
    }
  }

  /**
   * Share a Bonsai post with rich metadata
   */
  static async sharePost(postSlug: string, metadata?: Partial<ShareMetadata>): Promise<boolean> {
    const postUrl = `${window.location.origin}/post/${postSlug}`;
    
    const shareData: ShareData = {
      title: metadata?.title || 'Check out this post on Bonsai',
      text: metadata?.text || 'Discover amazing content and trade tokens on Bonsai',
      url: postUrl
    };

    return this.share(shareData);
  }

  /**
   * Share a club/token with rich metadata
   */
  static async shareClub(
    clubId: string, 
    tokenSymbol: string, 
    metadata?: Partial<ShareMetadata>
  ): Promise<boolean> {
    const clubUrl = `${window.location.origin}/club/${clubId}`;
    
    const shareData: ShareData = {
      title: metadata?.title || `$${tokenSymbol} on Bonsai`,
      text: metadata?.text || `Trade $${tokenSymbol} and join the community on Bonsai`,
      url: clubUrl
    };

    return this.share(shareData);
  }

  /**
   * Share a user profile
   */
  static async shareProfile(
    handle: string, 
    metadata?: Partial<ShareMetadata>
  ): Promise<boolean> {
    const profileUrl = `${window.location.origin}/profile/${handle}`;
    
    const shareData: ShareData = {
      title: metadata?.title || `${handle} on Bonsai`,
      text: metadata?.text || `Follow ${handle} and discover their content on Bonsai`,
      url: profileUrl
    };

    return this.share(shareData);
  }

  /**
   * Share a specific token page
   */
  static async shareToken(
    chain: string,
    tokenAddress: string,
    tokenSymbol: string,
    metadata?: Partial<ShareMetadata>
  ): Promise<boolean> {
    const tokenUrl = `${window.location.origin}/token/${chain}/${tokenAddress}`;
    
    const shareData: ShareData = {
      title: metadata?.title || `$${tokenSymbol} Token`,
      text: metadata?.text || `Check out $${tokenSymbol} token analytics and trading on Bonsai`,
      url: tokenUrl
    };

    return this.share(shareData);
  }

  /**
   * Share general Bonsai app
   */
  static async shareBonsai(metadata?: Partial<ShareMetadata>): Promise<boolean> {
    const bonsaiUrl = window.location.origin;
    
    const shareData: ShareData = {
      title: metadata?.title || 'Bonsai - Social Trading Platform',
      text: metadata?.text || 'Discover, create, and trade tokens with the community on Bonsai',
      url: bonsaiUrl
    };

    return this.share(shareData);
  }

  /**
   * Share with custom data
   */
  static async shareCustom(shareData: ShareData): Promise<boolean> {
    return this.share(shareData);
  }

  /**
   * Copy link directly to clipboard (always available as fallback)
   */
  static async copyLink(url: string, successMessage?: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(successMessage || 'Link copied to clipboard!', { 
        position: 'bottom-center', 
        duration: 2000 
      });
      haptics.success();
      return true;
    } catch (error) {
      console.error('Copy to clipboard failed:', error);
      toast.error('Failed to copy link');
      haptics.error();
      return false;
    }
  }

  /**
   * Get formatted share text for social media
   */
  static formatShareText(
    title: string, 
    description: string, 
    url: string, 
    hashtags?: string[]
  ): string {
    const hashtagText = hashtags?.length ? ` ${hashtags.map(tag => `#${tag}`).join(' ')}` : '';
    return `${title}\n\n${description}\n\n${url}${hashtagText}`;
  }

  /**
   * Share with image (if supported)
   */
  static async shareWithImage(
    shareData: ShareData, 
    imageBlob?: Blob
  ): Promise<boolean> {
    if (imageBlob && this.canShareFiles()) {
      const file = new File([imageBlob], 'bonsai-share.png', { type: 'image/png' });
      
      // Check if we can share this file
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        return this.share({
          ...shareData,
          files: [file]
        });
      }
    }
    
    // Fallback to sharing without image
    return this.share(shareData);
  }
}

// Convenience functions for common sharing scenarios
export const sharePost = WebShareManager.sharePost.bind(WebShareManager);
export const shareClub = WebShareManager.shareClub.bind(WebShareManager);
export const shareProfile = WebShareManager.shareProfile.bind(WebShareManager);
export const shareToken = WebShareManager.shareToken.bind(WebShareManager);
export const shareBonsai = WebShareManager.shareBonsai.bind(WebShareManager);
export const copyLink = WebShareManager.copyLink.bind(WebShareManager);
export const isWebShareSupported = WebShareManager.isSupported.bind(WebShareManager);
export const canShareFiles = WebShareManager.canShareFiles.bind(WebShareManager);

// React hook for web share
export const useWebShare = () => {
  return {
    isSupported: isWebShareSupported(),
    isPWA: WebShareManager.isPWA.bind(WebShareManager),
    canShareFiles: canShareFiles(),
    share: WebShareManager.share.bind(WebShareManager),
    sharePost,
    shareClub,
    shareProfile,
    shareToken,
    shareBonsai,
    copyLink,
    shareCustom: WebShareManager.shareCustom.bind(WebShareManager),
  };
}; 