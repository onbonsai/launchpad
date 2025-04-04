import { useState } from "react";
import Copy from "../Copy/Copy";
import clsx from "clsx";
import { brandFont } from "@src/fonts/fonts";

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
    <div
      className={clsx("flex flex-col w-full")}
      style={{
        fontFamily: brandFont.style.fontFamily,
      }}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Your Referrals</h2>
      </div>

      <div className="mb-6">
        <div className="mb-4 bg-gradient-to-r from-[#B6D5C2] to-[#52837D] p-3 rounded-lg">
          <p className="text-secondary/80 mb-4">
            <b>🎉Launch Week Special🎉</b>
          </p>
          <p className="text-secondary/80 mb-4">
            Refer at least 1 friend and get a 100% match on your stake up to 10k $BONSAI!
          </p>
        </div>
        <p className="text-secondary/80 mb-4">
          Share your referral link and earn rewards when others make their first post!
        </p>

        <div className="flex items-center gap-2">
          <Copy title="" text={referralLink} link={referralLink} />
        </div>
      </div>
    </div>
  );
};
