import { NextPage } from "next";
import { useAccount } from "wagmi";
import { formatUnits, isAddress, zeroAddress } from "viem";
import { useState, useMemo } from "react";
import Link from "next/link";

import { Header2, Header, Subtitle } from "@src/styles/text";
import { Button } from "@src/components/Button";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import {
  useGetLPPositions,
  useCollectFees,
  useUnlockPosition,
  formatUnlockTime,
  canUnlock,
  LP_CUSTODY_CONTRACT,
} from "@src/hooks/useLPCustody";
import useIsMounted from "@src/hooks/useIsMounted";
import { Modal } from "@src/components/Modal";
import LockPositionModal from "@src/components/LPCustody/LockPositionModal";
import toast from "react-hot-toast";
import { lensScanUrl } from "@src/services/madfi/moneyClubs";

const CustodyPage: NextPage = () => {
  const { address, isConnected } = useAccount();
  const isMounted = useIsMounted();
  const { data: positions, isLoading, refetch } = useGetLPPositions(address);
  const { collectFees, isCollecting } = useCollectFees();
  const { unlockPosition, isUnlocking } = useUnlockPosition();
  const [collectingTokenId, setCollectingTokenId] = useState<string | null>(null);
  const [unlockingTokenId, setUnlockingTokenId] = useState<string | null>(null);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<any>(null);
  const [token0Address, setToken0Address] = useState("");
  const [token1Address, setToken1Address] = useState("");
  const [showLockModal, setShowLockModal] = useState(false);

  // Format token ID for display
  const formatTokenId = (tokenId: string) => {
    return `#${tokenId}`;
  };

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Copy address to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  // Handle collect fees
  const handleCollectFees = async () => {
    if (!selectedPosition) return;

    // For V3 positions, use zero addresses
    let finalToken0: `0x${string}`;
    let finalToken1: `0x${string}`;

    if (selectedPosition.isV3) {
      // V3 positions don't need token addresses, use zero address
      finalToken0 = zeroAddress;
      finalToken1 = zeroAddress;
    } else {
      // V2 positions require token addresses
      if (!isAddress(token0Address) || !isAddress(token1Address)) {
        toast.error("Please enter valid token addresses");
        return;
      }
      finalToken0 = token0Address as `0x${string}`;
      finalToken1 = token1Address as `0x${string}`;
    }

    setCollectingTokenId(selectedPosition.tokenId);
    setShowTokenModal(false);

    try {
      await collectFees(
        selectedPosition.nftContract as `0x${string}`,
        BigInt(selectedPosition.tokenId),
        finalToken0,
        finalToken1,
        address,
      );

      // Refetch positions after successful collection
      setTimeout(() => {
        refetch();
        setCollectingTokenId(null);
        setToken0Address("");
        setToken1Address("");
        setSelectedPosition(null);
      }, 3000);
    } catch (error) {
      console.error("Error collecting fees:", error);
      setCollectingTokenId(null);
    }
  };

  // Open token input modal or directly collect fees for V3
  const openTokenModal = (position: any) => {
    setSelectedPosition(position);
    
    if (position.isV3) {
      // For V3 positions, directly collect fees without showing modal
      handleCollectFeesForV3(position);
    } else {
      // For V2 positions, show the modal to enter token addresses
      setShowTokenModal(true);
    }
  };

  // Handle collect fees for V3 positions (no token addresses needed)
  const handleCollectFeesForV3 = async (position: any) => {
    setCollectingTokenId(position.tokenId);

    try {
      await collectFees(
        position.nftContract as `0x${string}`,
        BigInt(position.tokenId),
        zeroAddress,
        zeroAddress,
        address,
      );

      // Refetch positions after successful collection
      setTimeout(() => {
        refetch();
        setCollectingTokenId(null);
      }, 3000);
    } catch (error) {
      console.error("Error collecting fees:", error);
      setCollectingTokenId(null);
    }
  };

  // Handle unlock position
  const handleUnlockPosition = async (position: any) => {
    setUnlockingTokenId(position.tokenId);
    
    try {
      await unlockPosition(
        position.nftContract as `0x${string}`,
        BigInt(position.tokenId)
      );
      
      // Refetch positions after successful unlock
      setTimeout(() => {
        refetch();
        setUnlockingTokenId(null);
      }, 3000);
    } catch (error) {
      console.error("Error unlocking position:", error);
      setUnlockingTokenId(null);
    }
  };

  // Calculate total fee collections
  const totalFeeCollections = useMemo(() => {
    if (!positions) return 0;
    return positions.reduce((total, position) => total + position.feeCollections.length, 0);
  }, [positions]);

  // Fix hydration issues
  if (!isMounted) return null;

  return (
    <div className="bg-background text-secondary min-h-[90vh]">
      <main className="mx-auto max-w-full md:max-w-[100rem] px-2 sm:px-6 lg:px-8 pt-6">
        <section aria-labelledby="custody-heading" className="pt-0 pb-24 max-w-full">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <Header>LP Custody Dashboard</Header>
                <Subtitle className="mt-2">Manage your locked liquidity positions and collect fees</Subtitle>
              </div>
              {isConnected && (
                <Button
                  onClick={() => setShowLockModal(true)}
                  variant="primary"
                  className="mt-4 sm:mt-0"
                >
                  Lock New Position
                </Button>
              )}
            </div>

            {/* Contract Address */}
            <div className="flex items-center gap-2 mt-4">
              <span className="text-sm text-gray-500">Contract:</span>
              <button
                onClick={() => copyToClipboard(LP_CUSTODY_CONTRACT)}
                className="flex items-center gap-1 text-sm text-primary hover:text-primary-hover transition-colors"
              >
                <span>{formatAddress(LP_CUSTODY_CONTRACT)}</span>
              </button>
            </div>
          </div>

          {/* Connect Wallet Message */}
          {!isConnected ? (
            <div className="bg-card rounded-lg p-8 text-center">
              <Header2 className="mb-4">Connect Your Wallet</Header2>
              <Subtitle className="mb-6">Please connect your wallet to view your locked LP positions</Subtitle>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner customClasses="h-8 w-8" color="#5be39d" />
            </div>
          ) : positions && positions.length > 0 ? (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-card rounded-lg p-4">
                  <Subtitle className="text-gray-500 mb-1">Total Positions</Subtitle>
                  <Header2>{positions.length}</Header2>
                </div>
                <div className="bg-card rounded-lg p-4">
                  <Subtitle className="text-gray-500 mb-1">Locked Positions</Subtitle>
                  <Header2>{positions.filter((p) => p.isLocked).length}</Header2>
                </div>
                <div className="bg-card rounded-lg p-4">
                  <Subtitle className="text-gray-500 mb-1">Total Collections</Subtitle>
                  <Header2>{totalFeeCollections}</Header2>
                </div>
              </div>

              {/* Positions Table */}
              <div className="bg-card rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-card-light">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Position
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          NFT Contract
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Token ID
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unlock Time
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {positions.map((position, index) => {
                        const unlockTime = formatUnlockTime(position.lockExpiry);
                        const isUnlocked = canUnlock(position.lockExpiry);
                        const isCurrentlyCollecting = collectingTokenId === position.tokenId;
                        const isCurrentlyUnlocking = unlockingTokenId === position.tokenId;

                        return (
                          <tr key={position.id} className="hover:bg-card-light transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm">#{index + 1}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <button
                                onClick={() => copyToClipboard(position.nftContract)}
                                className="flex items-center gap-1 text-primary hover:text-primary-hover transition-colors"
                              >
                                <span>{formatAddress(position.nftContract)}</span>
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{formatTokenId(position.tokenId)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  position.isV3 ? "bg-blue-500/20 text-blue-400" : "bg-gray-500/20 text-gray-400"
                                }`}
                              >
                                {position.isV3 ? "V3" : "V2"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={isUnlocked ? "text-green-400" : "text-yellow-400"}>{unlockTime}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  position.isLocked
                                    ? "bg-yellow-500/20 text-yellow-400"
                                    : "bg-green-500/20 text-green-400"
                                }`}
                              >
                                {position.isLocked ? "Locked" : "Unlocked"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => openTokenModal(position)}
                                  disabled={isCollecting || !position.isLocked}
                                  className="px-3 py-1 text-xs"
                                  variant="primary"
                                >
                                  {isCurrentlyCollecting ? (
                                    <div className="flex items-center gap-2">
                                      <Spinner customClasses="h-3 w-3" color="#fff" />
                                      <span>Collecting...</span>
                                    </div>
                                  ) : (
                                    "Collect Fees"
                                  )}
                                </Button>
                                {isUnlocked && position.isLocked && (
                                  <Button
                                    onClick={() => handleUnlockPosition(position)}
                                    disabled={isUnlocking}
                                    className="px-3 py-1 text-xs"
                                    variant="secondary"
                                  >
                                    {isCurrentlyUnlocking ? (
                                      <div className="flex items-center gap-2">
                                        <Spinner customClasses="h-3 w-3" color="#fff" />
                                        <span>Unlocking...</span>
                                      </div>
                                    ) : (
                                      "Unlock"
                                    )}
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Fee Collections History */}
              {positions.some((p) => p.feeCollections.length > 0) && (
                <div className="mt-8">
                  <Header2 className="mb-4">Recent Fee Collections</Header2>
                  <div className="bg-card rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-card-light">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Position
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Recipient
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Block
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Time
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Transaction
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {positions
                            .flatMap((position) =>
                              position.feeCollections.slice(0, 5).map((collection) => ({
                                ...collection,
                                tokenId: position.tokenId,
                              })),
                            )
                            .sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp))
                            .slice(0, 10)
                            .map((collection, index) => (
                              <tr key={`${collection.id}-${index}`} className="hover:bg-card-light transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  {formatTokenId(collection.tokenId)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  {formatAddress(collection.recipient)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  #{collection.blockNumber}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  {new Date(parseInt(collection.timestamp) * 1000).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <Link
                                    href={lensScanUrl(collection.transactionHash)}
                                    target="_blank"
                                    className="text-primary hover:text-primary-hover transition-colors"
                                  >
                                    {formatAddress(collection.transactionHash)}
                                  </Link>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-card rounded-lg p-8 text-center">
              <Header2 className="mb-4">No Locked Positions</Header2>
              <Subtitle className="mb-6">You don't have any locked LP positions in the custody contract</Subtitle>
              <Button 
                onClick={() => setShowLockModal(true)}
                variant="primary"
              >
                Lock Your First Position
              </Button>
            </div>
          )}
        </section>
      </main>

      {/* Token Input Modal */}
      <Modal
        open={showTokenModal}
        onClose={() => {
          setShowTokenModal(false);
          setToken0Address("");
          setToken1Address("");
          setSelectedPosition(null);
        }}
        setOpen={setShowTokenModal}
      >
        <div className="p-6">
          <Header2 className="mb-4">Enter Token Addresses</Header2>
          <Subtitle className="mb-4">
            Please enter the token addresses for the V2 pool to collect fees
          </Subtitle>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-secondary">Token 0 Address</label>
              <input
                type="text"
                value={token0Address}
                onChange={(e) => setToken0Address(e.target.value)}
                placeholder="0x..."
                className="w-full px-3 py-2 bg-background border border-gray-600 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-secondary">Token 1 Address</label>
              <input
                type="text"
                value={token1Address}
                onChange={(e) => setToken1Address(e.target.value)}
                placeholder="0x..."
                className="w-full px-3 py-2 bg-background border border-gray-600 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            <div className="text-xs text-gray-400">
              Note: V2 positions require token addresses. You can find these from the liquidity pool on the DEX interface.
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              onClick={handleCollectFees}
              disabled={!isAddress(token0Address) || !isAddress(token1Address)}
              className="flex-1"
              variant="primary"
            >
              Collect Fees
            </Button>
            <Button
              onClick={() => {
                setShowTokenModal(false);
                setToken0Address("");
                setToken1Address("");
                setSelectedPosition(null);
              }}
              className="flex-1"
              variant="secondary"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Lock Position Modal */}
      <LockPositionModal
        open={showLockModal}
        onClose={() => {
          setShowLockModal(false);
          // Refetch positions after closing in case a new position was locked
          refetch();
        }}
        setOpen={setShowLockModal}
      />
    </div>
  );
};

export default CustodyPage;
