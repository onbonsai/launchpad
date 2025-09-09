import { useState } from "react";
import { Modal } from "@src/components/Modal";
import { Header2, Subtitle } from "@src/styles/text";
import { Button } from "@src/components/Button";
import { useLockPosition, LOCK_PERIODS } from "@src/hooks/useLPCustody";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import toast from "react-hot-toast";
import { isAddress } from "viem";

interface LockPositionModalProps {
  open: boolean;
  onClose: () => void;
  setOpen: (open: boolean) => void;
}

export const LockPositionModal: React.FC<LockPositionModalProps> = ({ open, onClose, setOpen }) => {
  const [nftContract, setNftContract] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [lockPeriod, setLockPeriod] = useState(LOCK_PERIODS[0].value);
  const [isV3, setIsV3] = useState(true);
  const [customPeriod, setCustomPeriod] = useState("");
  const [useCustomPeriod, setUseCustomPeriod] = useState(false);

  const { lockPosition, isLocking } = useLockPosition();

  const handleLock = async () => {
    // Validate inputs
    if (!isAddress(nftContract)) {
      toast.error("Please enter a valid NFT contract address");
      return;
    }

    if (!tokenId || isNaN(Number(tokenId))) {
      toast.error("Please enter a valid token ID");
      return;
    }

    const finalLockPeriod = useCustomPeriod 
      ? Number(customPeriod) * 24 * 60 * 60 // Convert days to seconds
      : lockPeriod;

    if (finalLockPeriod <= 0) {
      toast.error("Lock period must be greater than 0");
      return;
    }

    try {
      await lockPosition(
        nftContract as `0x${string}`,
        BigInt(tokenId),
        BigInt(finalLockPeriod),
        isV3
      );

      // Reset form on success
      setTimeout(() => {
        setNftContract("");
        setTokenId("");
        setLockPeriod(LOCK_PERIODS[0].value);
        setCustomPeriod("");
        setUseCustomPeriod(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Error locking position:", error);
    }
  };

  return (
    <Modal open={open} onClose={onClose} setOpen={setOpen}>
      <div className="p-6">
        <Header2 className="mb-4">Lock LP Position</Header2>
        <Subtitle className="mb-4">
          Lock your LP NFT position in the custody contract to earn rewards
        </Subtitle>

        <div className="space-y-4">
          {/* NFT Contract Address */}
          <div>
            <label className="block text-sm font-medium mb-2 text-secondary">
              NFT Contract Address
            </label>
            <input
              type="text"
              value={nftContract}
              onChange={(e) => setNftContract(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 bg-background border border-gray-600 rounded-lg focus:outline-none focus:border-primary text-secondary"
            />
          </div>

          {/* Token ID */}
          <div>
            <label className="block text-sm font-medium mb-2 text-secondary">
              Token ID
            </label>
            <input
              type="text"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              placeholder="Enter token ID"
              className="w-full px-3 py-2 bg-background border border-gray-600 rounded-lg focus:outline-none focus:border-primary text-secondary"
            />
          </div>

          {/* Position Type */}
          <div>
            <label className="block text-sm font-medium mb-2 text-secondary">
              Position Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center text-secondary">
                <input
                  type="radio"
                  checked={isV3}
                  onChange={() => setIsV3(true)}
                  className="mr-2"
                />
                <span>Uniswap V3</span>
              </label>
              <label className="flex items-center text-secondary/50">
                <input
                  type="radio"
                  checked={!isV3}
                  onChange={() => setIsV3(false)}
                  className="mr-2"
                  disabled
                />
                <span>Uniswap V4</span>
              </label>
            </div>
          </div>

          {/* Lock Period */}
          <div>
            <label className="block text-sm font-medium mb-2 text-secondary">
              Lock Period
            </label>
            {!useCustomPeriod ? (
              <select
                value={lockPeriod}
                onChange={(e) => setLockPeriod(Number(e.target.value))}
                className="w-full px-3 py-2 bg-background border border-gray-600 rounded-lg focus:outline-none focus:border-primary text-secondary"
              >
                {LOCK_PERIODS.map((period) => (
                  <option key={period.value} value={period.value} className="text-secondary">
                    {period.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  type="number"
                  value={customPeriod}
                  onChange={(e) => setCustomPeriod(e.target.value)}
                  placeholder="Enter days"
                  className="flex-1 px-3 py-2 bg-background border border-gray-600 rounded-lg focus:outline-none focus:border-primary"
                />
                <span className="flex items-center px-3 text-secondary/70">days</span>
              </div>
            )}
            <button
              onClick={() => setUseCustomPeriod(!useCustomPeriod)}
              className="text-xs text-gray-400 hover:text-gray-400/50 mt-2"
            >
              {useCustomPeriod ? "Use preset periods" : "Enter custom period"}
            </button>
          </div>

          {/* Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <p className="text-sm text-yellow-400">
              ⚠️ Warning: Once locked, you cannot withdraw your position until the lock period expires.
              Make sure you understand the terms before proceeding.
            </p>
          </div>

          {/* Note about approvals */}
          <div className="text-xs text-gray-400">
            Note: You'll need to approve the custody contract to transfer your NFT before locking.
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            onClick={handleLock}
            disabled={isLocking || !isAddress(nftContract) || !tokenId}
            className="flex-1"
            variant="primary"
          >
            {isLocking ? (
              <div className="flex items-center justify-center gap-2">
                <Spinner customClasses="h-4 w-4" color="#fff" />
                <span>Locking...</span>
              </div>
            ) : (
              "Lock Position"
            )}
          </Button>
          <Button
            onClick={() => {
              onClose();
              setNftContract("");
              setTokenId("");
              setLockPeriod(LOCK_PERIODS[0].value);
              setCustomPeriod("");
              setUseCustomPeriod(false);
            }}
            className="flex-1"
            variant="secondary"
            disabled={isLocking}
          >
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default LockPositionModal;
