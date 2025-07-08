import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { createReadStream } from 'fs';

interface TikTokCredentials {
    clientKey: string;
    clientSecret: string;
    redirectUri?: string; // Optional for backend-only auth
    sandboxMode?: boolean; // Enable sandbox mode
}

interface TikTokAccessToken {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    openId?: string; // Store user's open_id for reference
}

// New interface for direct auth with long-lived tokens
interface TikTokDirectAuth {
    accessToken: string;
    refreshToken: string;
    expiresIn?: number; // Optional, defaults to 24 hours
    openId?: string;
}

interface VideoUploadParams {
    title: string;
    description?: string;
    videoUrl?: string;
    videoFilePath?: string;
    privacy?: 'PUBLIC' | 'PRIVATE' | 'FRIENDS_ONLY';
    allowComments?: boolean;
    allowDuet?: boolean;
    allowStitch?: boolean;
    brandContentToggle?: boolean;
    brandOrganicToggle?: boolean;
    postMode?: 'DIRECT_POST' | 'DRAFT';
}

interface TikTokVideoUploadResponse {
    data: {
        publish_id: string;
        upload_url?: string;
    };
    error: {
        code: string;
        message: string;
        log_id: string;
    };
}

interface TikTokVideoStatusResponse {
    data: {
        status: 'PROCESSING_UPLOAD' | 'PROCESSING_PUBLISH' | 'PUBLISH_COMPLETE' | 'FAILED';
        publicly_available_post_id?: string[];
        uploaded_bytes?: number;
        fail_reason?: string;
    };
    error: {
        code: string;
        message: string;
        log_id: string;
    };
}

interface TikTokUserInfo {
    data: {
        user: {
            open_id: string;
            union_id: string;
            avatar_url: string;
            display_name: string;
            username: string;
            profile_deep_link: string;
            follower_count: number;
            following_count: number;
            likes_count: number;
            video_count: number;
        };
    };
    error: {
        code: string;
        message: string;
        log_id: string;
    };
}

// API endpoints - different for sandbox vs production
const getApiEndpoints = (sandboxMode: boolean) => {
          return {
            API_BASE_URL: 'https://open.tiktokapis.com',
            AUTH_URL: 'https://www.tiktok.com/v2/auth/authorize',
            TOKEN_URL: 'https://open.tiktokapis.com/v2/oauth/token/'
        };
};

export class TikTokService {
    private credentials: TikTokCredentials;
    private accessToken: TikTokAccessToken | null = null;
    private sandboxMode: boolean;
    private endpoints: ReturnType<typeof getApiEndpoints>;

    constructor(credentials: TikTokCredentials) {
        this.credentials = credentials;
        this.sandboxMode = credentials.sandboxMode || false;
        this.endpoints = getApiEndpoints(this.sandboxMode);

        if (this.sandboxMode) {
            console.log('🧪 TikTok service initialized in SANDBOX mode');
        }
    }

    /**
     * Set authentication directly with access token and refresh token
     * Best for single-user backend scenarios
     */
    setDirectAuth(auth: TikTokDirectAuth): void {
        this.accessToken = {
            accessToken: auth.accessToken,
            refreshToken: auth.refreshToken,
            expiresAt: Date.now() + (auth.expiresIn || 86400) * 1000, // Default 24 hours
            openId: auth.openId
        };
    }

    /**
     * Load authentication from environment variables
     * Set these in your .env file:
     * TIKTOK_ACCESS_TOKEN=your_access_token
     * TIKTOK_REFRESH_TOKEN=your_refresh_token
     * TIKTOK_TOKEN_EXPIRES_IN=86400 (optional, defaults to 24 hours)
     * TIKTOK_SANDBOX_MODE=true (optional, for sandbox testing)
     */
    loadAuthFromEnv(): void {
        const accessToken = process.env.TIKTOK_ACCESS_TOKEN;
        const refreshToken = process.env.TIKTOK_REFRESH_TOKEN;
        const expiresIn = process.env.TIKTOK_TOKEN_EXPIRES_IN;

        if (!accessToken || !refreshToken) {
            throw new Error('TIKTOK_ACCESS_TOKEN and TIKTOK_REFRESH_TOKEN environment variables are required');
        }

        this.setDirectAuth({
            accessToken,
            refreshToken,
            expiresIn: expiresIn ? parseInt(expiresIn) : undefined
        });
    }

    /**
     * Check if service is in sandbox mode
     */
    isSandboxMode(): boolean {
        return this.sandboxMode;
    }

    /**
     * Get authentication URL for one-time manual setup
     * Use this URL in a browser to get the code, then use getTokenFromCode()
     */
    getOneTimeAuthUrl(): string {
        const scopes = [
            'user.info.basic',
            'user.info.profile',
            'user.info.stats',
            'video.upload',
            'video.publish',
            'video.list'
        ];

        const state = `manual_auth_${Date.now()}${this.sandboxMode ? '_sandbox' : ''}`;
        const redirectUri = this.credentials.redirectUri || 'https://localhost:3000/callback';

        const params = new URLSearchParams({
            client_key: this.credentials.clientKey,
            scope: scopes.join(','),
            response_type: 'code',
            redirect_uri: redirectUri,
            state: state
        });

        // Add sandbox parameter if in sandbox mode
        if (this.sandboxMode) {
            params.append('sandbox', 'true');
        }

        return `${this.endpoints.AUTH_URL}?${params.toString()}`;
    }

    /**
     * Exchange authorization code for tokens (one-time manual setup)
     * After visiting the auth URL, extract the code parameter and use this method
     */
    async getTokenFromCode(code: string): Promise<TikTokAccessToken> {
        try {
            const redirectUri = this.credentials.redirectUri || 'https://localhost:3000/callback';

            const requestData = new URLSearchParams({
                client_key: this.credentials.clientKey,
                client_secret: this.credentials.clientSecret,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri
            });

            console.log(`POST: ${this.endpoints.TOKEN_URL}`)
            console.log(requestData.toString());

            const response = await axios.post(this.endpoints.TOKEN_URL, requestData, {
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            const { access_token, refresh_token, expires_in, open_id } = response.data;

            this.accessToken = {
                accessToken: access_token,
                refreshToken: refresh_token,
                expiresAt: Date.now() + (expires_in * 1000),
                openId: open_id
            };

            // Print tokens for storage
            if (this.sandboxMode) {
                console.log(`TIKTOK_SANDBOX_MODE=true`);
            }
            if (open_id) {
                console.log(`TIKTOK_OPEN_ID=${open_id}`);
            }

            return this.accessToken;
        } catch (error) {
            console.error('TikTok auth error:', error.response?.data || error.message);
            if (this.sandboxMode && error.response?.status === 400) {
                console.log('💡 Sandbox auth tip: Make sure your sandbox is properly configured and you\'re using the correct test account');
            }
            throw new Error('Failed to exchange code for access token');
        }
    }

    /**
     * Generate OAuth authorization URL (legacy method)
     */
    generateAuthUrl(state?: string): string {
        const scopes = [
            'user.info.basic',
            'user.info.profile',
            'user.info.stats',
            'video.upload',
            'video.publish',
            'video.list'
        ];

        const redirectUri = this.credentials.redirectUri || 'https://localhost:3000/callback';

        const params = new URLSearchParams({
            client_key: this.credentials.clientKey,
            scope: scopes.join(','),
            response_type: 'code',
            redirect_uri: redirectUri,
            state: state || Date.now().toString()
        });

        if (this.sandboxMode) {
            params.append('sandbox', 'true');
        }

        return `${this.endpoints.AUTH_URL}?${params.toString()}`;
    }

    /**
     * Exchange authorization code for access token (legacy method)
     */
    async exchangeCodeForToken(code: string): Promise<TikTokAccessToken> {
        return this.getTokenFromCode(code);
    }

    /**
     * Refresh access token
     */
    async refreshAccessToken(): Promise<TikTokAccessToken> {
        if (!this.accessToken?.refreshToken) {
            throw new Error('No refresh token available');
        }

        try {
            const requestData = {
                client_key: this.credentials.clientKey,
                client_secret: this.credentials.clientSecret,
                refresh_token: this.accessToken.refreshToken,
                grant_type: 'refresh_token'
            };

            if (this.sandboxMode) {
                (requestData as any).sandbox = true;
            }

            const response = await axios.post(this.endpoints.TOKEN_URL, requestData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const { access_token, refresh_token, expires_in, open_id } = response.data;

            this.accessToken = {
                accessToken: access_token,
                refreshToken: refresh_token,
                expiresAt: Date.now() + (expires_in * 1000),
                openId: open_id || this.accessToken.openId
            };

            console.log(`🔄 Token refreshed successfully${this.sandboxMode ? ' (SANDBOX)' : ''}`);
            return this.accessToken;
        } catch (error) {
            console.error('TikTok token refresh error:', error.response?.data || error.message);
            throw new Error('Failed to refresh access token');
        }
    }

    /**
     * Set access token manually (legacy method)
     */
    setAccessToken(token: TikTokAccessToken): void {
        this.accessToken = token;
    }

    /**
     * Get current access token info
     */
    getAccessToken(): TikTokAccessToken | null {
        return this.accessToken;
    }

    /**
     * Check if service is authenticated
     */
    isAuthenticated(): boolean {
        return this.accessToken !== null;
    }

    /**
     * Check if access token is valid and refresh if needed
     */
    private async ensureValidToken(): Promise<void> {
        if (!this.accessToken) {
            throw new Error('No access token available. Please authenticate first using setDirectAuth(), loadAuthFromEnv(), or getTokenFromCode()');
        }

        // Check if token is expired (with 5 minute buffer)
        if (Date.now() >= (this.accessToken.expiresAt - 300000)) {
            console.log(`🔄 Token expired, refreshing...${this.sandboxMode ? ' (SANDBOX)' : ''}`);
            await this.refreshAccessToken();
        }
    }

    /**
     * Get user profile information
     */
    async getUserInfo(): Promise<TikTokUserInfo> {
        await this.ensureValidToken();

        try {
            const fields = [
                'open_id',
                'union_id',
                'avatar_url',
                'display_name',
                'username',
                'profile_deep_link',
                'follower_count',
                'following_count',
                'likes_count',
                'video_count'
            ];

            const response = await axios.get(`${this.endpoints.API_BASE_URL}/v2/user/info/`, {
                params: {
                    fields: fields.join(',')
                },
                headers: {
                    'Authorization': `Bearer ${this.accessToken!.accessToken}`
                }
            });

            return response.data;
        } catch (error) {
            console.error('TikTok user info error:', error.response?.data || error.message);
            throw new Error('Failed to get user info');
        }
    }

    /**
     * Upload video to TikTok - URL method
     */
    async uploadVideoFromUrl(params: VideoUploadParams): Promise<string> {
        await this.ensureValidToken();

        if (!params.videoUrl) {
            throw new Error('Video URL is required for URL upload method');
        }

        try {
            const postData = {
                source_info: {
                    source: 'PULL_FROM_URL',
                    video_url: params.videoUrl
                }
            };

            // In sandbox mode, Direct Post may not be available, so default to DRAFT
            let postMode = params.postMode;
            if (this.sandboxMode && postMode === 'DIRECT_POST') {
                console.log('🧪 Sandbox mode: Using DRAFT mode instead of DIRECT_POST');
                postMode = 'DRAFT';
            }

            const endpoint = postMode === 'DIRECT_POST'
                ? `${this.endpoints.API_BASE_URL}/v2/post/publish/video/init/`
                : `${this.endpoints.API_BASE_URL}/v2/post/publish/inbox/video/init/`;

            const response = await axios.post(endpoint, postData, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken!.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const result: TikTokVideoUploadResponse = response.data;

            if (result.error.code !== 'ok') {
                throw new Error(`TikTok API error: ${result.error.message}`);
            }

            return result.data.publish_id;
        } catch (error) {
            console.error('TikTok video upload error:', error.response?.data || error.message);
            if (this.sandboxMode && error.response?.status === 403) {
                console.log('💡 Sandbox limitation: Direct posting may not be available in sandbox mode');
            }
            throw new Error('Failed to upload video to TikTok');
        }
    }

    /**
     * Upload video to TikTok - File method
     */
    async uploadVideoFromFile(params: VideoUploadParams): Promise<string> {
        await this.ensureValidToken();

        if (!params.videoFilePath) {
            throw new Error('Video file path is required for file upload method');
        }

        try {
            // Get file stats
            const stats = fs.statSync(params.videoFilePath);
            const fileSize = stats.size;
            const chunkSize = 10 * 1024 * 1024; // 10MB chunks
            const totalChunks = Math.ceil(fileSize / chunkSize);

            const postData = {
                source_info: {
                    source: 'FILE_UPLOAD',
                    video_size: fileSize,
                    chunk_size: chunkSize,
                    total_chunk_count: totalChunks
                }
            };

            // In sandbox mode, Direct Post may not be available, so default to DRAFT
            let postMode = params.postMode;
            if (this.sandboxMode && postMode === 'DIRECT_POST') {
                console.log('🧪 Sandbox mode: Using DRAFT mode instead of DIRECT_POST');
                postMode = 'DRAFT';
            }

            const endpoint = postMode === 'DIRECT_POST'
                ? `${this.endpoints.API_BASE_URL}/v2/post/publish/video/init/`
                : `${this.endpoints.API_BASE_URL}/v2/post/publish/inbox/video/init/`;

            const response = await axios.post(endpoint, postData, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken!.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const result: TikTokVideoUploadResponse = response.data;

            if (result.error.code !== 'ok') {
                throw new Error(`TikTok API error: ${result.error.message}`);
            }

            // Upload file chunks
            if (result.data.upload_url) {
                await this.uploadFileChunks(params.videoFilePath, result.data.upload_url, chunkSize);
            }

            return result.data.publish_id;
        } catch (error) {
            console.error('TikTok video upload error:', error.response?.data || error.message);
            throw new Error('Failed to upload video file to TikTok');
        }
    }

    /**
     * Upload file in chunks
     */
    private async uploadFileChunks(filePath: string, uploadUrl: string, chunkSize: number): Promise<void> {
        const fileSize = fs.statSync(filePath).size;
        const totalChunks = Math.ceil(fileSize / chunkSize);

        for (let i = 0; i < totalChunks; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, fileSize);
            const chunk = fs.createReadStream(filePath, { start, end: end - 1 });

            const formData = new FormData();
            formData.append('video', chunk);

            await axios.post(uploadUrl, formData, {
                headers: {
                    ...formData.getHeaders(),
                    'Content-Range': `bytes ${start}-${end - 1}/${fileSize}`
                }
            });
        }
    }

    /**
     * Publish video with metadata (for direct post)
     */
    async publishVideo(publishId: string, params: VideoUploadParams): Promise<string> {
        await this.ensureValidToken();

        if (this.sandboxMode) {
            console.log('🧪 Sandbox mode: Publishing may be limited to draft mode');
        }

        try {
            const postData = {
                publish_id: publishId,
                post_info: {
                    title: params.title,
                    description: params.description || '',
                    privacy_level: params.privacy || 'PUBLIC',
                    disable_duet: !params.allowDuet,
                    disable_stitch: !params.allowStitch,
                    disable_comment: !params.allowComments,
                    brand_content_toggle: params.brandContentToggle || false,
                    brand_organic_toggle: params.brandOrganicToggle || false
                }
            };

            const response = await axios.post(`${this.endpoints.API_BASE_URL}/v2/post/publish/`, postData, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken!.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const result: TikTokVideoUploadResponse = response.data;

            if (result.error.code !== 'ok') {
                throw new Error(`TikTok API error: ${result.error.message}`);
            }

            return result.data.publish_id;
        } catch (error) {
            console.error('TikTok video publish error:', error.response?.data || error.message);
            throw new Error('Failed to publish video to TikTok');
        }
    }

    /**
     * Check upload/publish status
     */
    async checkVideoStatus(publishId: string): Promise<TikTokVideoStatusResponse> {
        await this.ensureValidToken();

        try {
            const response = await axios.post(`${this.endpoints.API_BASE_URL}/v2/post/publish/status/fetch/`, {
                publish_id: publishId
            }, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken!.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('TikTok status check error:', error.response?.data || error.message);
            throw new Error('Failed to check video status');
        }
    }

    /**
     * Wait for video processing to complete
     */
    async waitForVideoProcessing(publishId: string, maxWaitTime: number = 300000): Promise<TikTokVideoStatusResponse> {
        const startTime = Date.now();
        const checkInterval = 10000; // Check every 10 seconds

        while (Date.now() - startTime < maxWaitTime) {
            const status = await this.checkVideoStatus(publishId);

            console.log(`Video processing status: ${status.data.status}${this.sandboxMode ? ' (SANDBOX)' : ''}`);

            if (status.data.status === 'PUBLISH_COMPLETE') {
                return status;
            }

            if (status.data.status === 'FAILED') {
                throw new Error(`Video processing failed: ${status.data.fail_reason}`);
            }

            // Wait before next check
            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }

        throw new Error('Video processing timed out');
    }

    /**
     * Complete video posting workflow
     */
    async postVideo(params: VideoUploadParams): Promise<{
        publishId: string;
        videoId?: string;
        status: string;
        videoUrl?: string;
        username?: string;
        sandboxMode?: boolean;
    }> {
        try {
            // Get user info for username
            const userInfo = await this.getUserInfo();
            const username = userInfo.data.user.username;

            // Upload video
            let publishId: string;
            if (params.videoUrl) {
                publishId = await this.uploadVideoFromUrl(params);
            } else if (params.videoFilePath) {
                publishId = await this.uploadVideoFromFile(params);
            } else {
                throw new Error('Either videoUrl or videoFilePath must be provided');
            }

            // For direct post mode, publish the video (if supported in current mode)
            if (params.postMode === 'DIRECT_POST' && !this.sandboxMode) {
                await this.publishVideo(publishId, params);
            }

            // Wait for processing to complete
            const finalStatus = await this.waitForVideoProcessing(publishId);

            // Construct video URL if available
            let videoUrl: string | undefined;
            if (finalStatus.data.publicly_available_post_id?.[0] && !this.sandboxMode) {
                videoUrl = `https://www.tiktok.com/@${username}/video/${finalStatus.data.publicly_available_post_id[0]}`;
            }

            return {
                publishId,
                videoId: finalStatus.data.publicly_available_post_id?.[0],
                status: finalStatus.data.status,
                videoUrl,
                username,
                sandboxMode: this.sandboxMode
            };
        } catch (error) {
            console.error('TikTok post video error:', error.message);
            throw error;
        }
    }
}

// Helper function to create TikTok service instance
export const createTikTokService = (credentials: TikTokCredentials): TikTokService => {
    return new TikTokService(credentials);
};

// Helper function to create TikTok service with direct authentication
export const createTikTokServiceWithAuth = (credentials: TikTokCredentials, auth: TikTokDirectAuth): TikTokService => {
    const service = new TikTokService(credentials);
    service.setDirectAuth(auth);
    return service;
};

// Helper function to create TikTok service with environment variables
export const createTikTokServiceFromEnv = (): TikTokService => {
    const sandboxMode = process.env.TIKTOK_SANDBOX_MODE === 'true';

    const credentials: TikTokCredentials = {
        clientKey: process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY!,
        clientSecret: process.env.TIKTOK_CLIENT_SECRET!,
        redirectUri: process.env.TIKTOK_REDIRECT_URI,
        sandboxMode
    };

    const service = new TikTokService(credentials);
    service.loadAuthFromEnv();
    return service;
};

// Export types for external use
export type {
    TikTokCredentials,
    TikTokAccessToken,
    TikTokDirectAuth,
    VideoUploadParams,
    TikTokVideoUploadResponse,
    TikTokVideoStatusResponse,
    TikTokUserInfo
};