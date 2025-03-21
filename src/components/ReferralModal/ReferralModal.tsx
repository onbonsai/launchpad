import { useState } from "react";
import { Button } from "@src/components/Button";

interface ReferralModalProps {
  onClose: () => void;
  referralLink: string;
}

export const ReferralModal = ({ onClose, referralLink }: ReferralModalProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6 font-owners">
        <h2 className="text-2xl font-bold">Your Referrals</h2>
      </div>

      <div className="mb-6 font-sf-pro-text">
        <div className="mb-4 bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-lg">
          <p className="text-secondary/80 mb-4"><b>🎉Launch Week Special🎉</b></p>
          <p className="text-secondary/80 mb-4">
            Refer at least 1 friend before April 7th and get a 100% match on your stake up to 10k $BONSAI!
          </p>
        </div>
        <p className="text-secondary/80 mb-4">
          Share your referral link and earn rewards when others make their first post!
        </p>

        <div className="flex items-center gap-2 bg-card-light p-3 rounded-lg">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="bg-transparent flex-1 outline-none text-secondary"
          />
          <Button variant="accent" size="sm" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
      </div>
    </div>
  );
};
