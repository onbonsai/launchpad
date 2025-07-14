import { useAccount } from "wagmi"
import { useAuthenticatedLensProfile } from "@src/hooks/useLensProfile"
import { Header, Header2 } from "@src/styles/text"
import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import { Button } from "@src/components/Button/Button"
import Sidebar from "@pagesComponents/Studio/Sidebar"
import { useTikTokIntegration } from "@src/hooks/useTikTokIntegration"
import Image from "next/image"

interface Integration {
  id: string
  name: string
  description: string
  logo: string
  connected: boolean
  scopes?: string[]
  username?: string
  connectedSince?: string
}

const IntegrationsPage = () => {
  const { address, isConnected } = useAccount()
  const { data: authenticatedProfile } = useAuthenticatedLensProfile()
  const router = useRouter()

    // Use the TikTok integration hook
  const tikTokIntegration = useTikTokIntegration()

  // Local state for OAuth callback handling
  const [callbackLoading, setCallbackLoading] = useState(false)
  const [callbackError, setCallbackError] = useState<string | null>(null)
  const [callbackProcessed, setCallbackProcessed] = useState(false)

  // Create integrations array based on hook state
  const integrations: Integration[] = [
    {
      id: 'tiktok',
      name: 'TikTok',
      description: 'Post generated videos directly to your TikTok account',
      logo: '/tiktok.png',
      connected: tikTokIntegration.isConnected,
      username: tikTokIntegration.integration?.username,
      connectedSince: tikTokIntegration.integration?.connectedAt,
      scopes: tikTokIntegration.integration?.scopes,
    }
  ]

  // Handle OAuth callback from URL params
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const { code, state } = router.query;

      // Detect TikTok OAuth callback by presence of code and state
      // Only process if we haven't already processed this callback
      if (
        code &&
        state &&
        address &&
        typeof state === 'string' &&
        state.startsWith('auth_') &&
        state.endsWith(`_${address}`) &&
        !callbackProcessed &&
        !callbackLoading
      ) {
        setCallbackLoading(true);
        setCallbackError(null);
        setCallbackProcessed(true);

        try {
          // Call the connect API endpoint to exchange code for tokens
          const response = await fetch('/api/integrations/tiktok/connect', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code,
              state,
              userAddress: address
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to connect TikTok account');
          }

          if (data.success) {
            // Refresh integration status to get latest data
            await tikTokIntegration.refreshStatus();

            // Clean up URL parameters after successful processing
            router.replace('/studio/integrations', undefined, { shallow: true });
          }
        } catch (error) {
          console.error('TikTok OAuth callback error:', error);
          setCallbackError(error instanceof Error ? error.message : 'Failed to complete TikTok connection. Please try again.');
        } finally {
          setCallbackLoading(false);
        }
      }
    };

    handleOAuthCallback();
  }, [router.query, address, tikTokIntegration.refreshStatus, callbackProcessed, callbackLoading]);

  const handleConnect = async (integrationId: string) => {
    if (integrationId === 'tiktok') {
      await tikTokIntegration.connect();
    }
  }

  const handleDisconnect = async (integrationId: string) => {
    if (integrationId === 'tiktok') {
      await tikTokIntegration.disconnect();
    }
  }

    return (
    <div className="bg-background text-secondary min-h-[90vh]">
      <main className="mx-auto max-w-full md-plus:max-w-[100rem] px-2 sm:px-6 pt-6">
        <section aria-labelledby="integrations-heading" className="pt-0 pb-6 max-w-full">
          <div className="flex flex-col md-plus:flex-row gap-y-6 md-plus:gap-x-6 max-w-full">
            <div className="md-plus:w-64 flex-shrink-0 md-plus:sticky md-plus:top-6 md-plus:self-start">
              <Sidebar />
            </div>
            {/* Main Content */}
            <div className="flex-grow">
              <div className="space-y-6">
                <div className="bg-card rounded-lg p-6">
                  <Header className="mb-2">Integrations</Header>
                  <p className="text-secondary/70">
                    Connect your account to third-party services to expand your reach and automate your content distribution.
                  </p>
                </div>

                {/* Error Message */}
                {(tikTokIntegration.error || callbackError) && (
                  <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                    <p className="text-red-400 text-sm">{tikTokIntegration.error || callbackError}</p>
                  </div>
                )}

                {/* Loading State */}
                {(tikTokIntegration.loading || callbackLoading) && (
                  <div className="bg-card rounded-lg p-6 border border-gray-700/50">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 bg-brand-highlight rounded-full animate-pulse"></div>
                      <p className="text-secondary/70">
                        {callbackLoading ? 'Completing TikTok connection...' : 'Processing integration...'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Wallet Connection Required */}
                {!isConnected && (
                  <div className="bg-card rounded-lg p-6 border border-gray-700/50">
                    <div className="text-center">
                      <p className="text-secondary/70 mb-4 mt-4">
                        Please connect your wallet to manage integrations.
                      </p>
                    </div>
                  </div>
                )}

                {/* Integrations List */}
                {isConnected && (
                  <div className="space-y-4">
                    {integrations.map((integration) => (
                      <div
                        key={integration.id}
                        className="bg-card rounded-lg p-6 border border-gray-700/50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-card-light rounded-lg flex items-center justify-center">
                              {/* Placeholder for logo - we'll add actual logos later */}
                              {integration.logo ? (
                                <Image
                                  src={integration.logo}
                                  alt={`${integration.name} logo`}
                                  width={32}
                                  height={32}
                                  className="rounded-full"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-brand-highlight rounded-full flex items-center justify-center">
                                  <span className="text-true-black font-bold text-sm">
                                    {integration.name.charAt(0)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div>
                              <Header2 className="text-xl font-medium">
                                {integration.name}
                              </Header2>
                              <p className="text-secondary/70 text-md">
                                {integration.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            {integration.connected ? (
                              <div className="text-right">
                                {integration.username && (
                                  <p className="text-md text-brand-highlight/70">
                                    @{integration.username}
                                  </p>
                                )}
                                <Button
                                  onClick={() => handleDisconnect(integration.id)}
                                  variant="dark-grey"
                                  size="sm"
                                  className="text-xs mt-2 text-red-400 hover:text-red-300"
                                  disabled={tikTokIntegration.loading}
                                >
                                  {tikTokIntegration.loading ? 'Disconnecting...' : 'Disconnect'}
                                </Button>
                              </div>
                            ) : (
                              <Button
                                onClick={() => handleConnect(integration.id)}
                                variant="accentBrand"
                                className="px-6"
                                disabled={tikTokIntegration.loading}
                              >
                                {tikTokIntegration.loading ? 'Connecting...' : 'Connect'}
                              </Button>
                            )}
                          </div>
                        </div>

                        {integration.connected && integration.scopes && (
                          <div className="mt-4 pt-4 border-t border-gray-700/50">
                            <p className="text-xs text-secondary/70 mb-2">Permissions:</p>
                            <div className="flex flex-wrap gap-1">
                              {integration.scopes.map((scope) => (
                                <span
                                  key={scope}
                                  className="px-2 py-1 bg-card-light text-xs rounded text-secondary/80"
                                >
                                  {scope}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {integrations.length === 0 && (
                      <div className="text-center py-12">
                        <p className="text-secondary/70">No integrations available yet.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default IntegrationsPage