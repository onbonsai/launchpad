import Copy from "../Copy/Copy";
import clsx from "clsx";
import { brandFont } from "@src/fonts/fonts";

interface ReferralModalProps {
  onClose: () => void;
  referralLink: string;
}

export const ReferralModal = ({ onClose, referralLink }: ReferralModalProps) => {
  return (
    <div
      className={clsx("flex flex-col w-full p-4 md:p-6 max-h-[90vh] overflow-y-auto")}
      style={{
        fontFamily: brandFont.style.fontFamily,
      }}
    >
      <div className="flex justify-between items-center mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold">Your Referrals</h2>
      </div>

      <div className="space-y-4">
        <div className="bg-gradient-to-r from-[#B6D5C2] to-[#52837D] p-3 md:p-4 rounded-lg">
          <p className="text-brand-secondary text-sm md:text-base mb-2 md:mb-4">
            <b>🎉 Launch Week Special 🎉</b>
          </p>
          <p className="text-brand-secondary text-sm md:text-base">
            Refer at least 1 friend and get a 100% match on your stake up to 10k $BONSAI
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-secondary/80 text-sm md:text-base">
            Share your referral link to earn rewards.
          </p>

          <div className="w-full">
            <Copy title="" text={referralLink} link={referralLink} />
          </div>
        </div>
      </div>
    </div>
  );
};
