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
      className={clsx("flex flex-col w-full p-4 md:p-0")}
      style={{
        fontFamily: brandFont.style.fontFamily,
      }}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Your Referrals</h2>
      </div>

      <div className="mb-2">
        <div className="mb-4 bg-gradient-to-r from-[#B6D5C2] to-[#52837D] p-3 rounded-lg">
          <p className="text-brand-secondary mb-4">
            <b>🎉 Launch Week Special 🎉</b>
          </p>
          <p className="text-brand-secondary mb-4">
            Refer at least 1 friend and get a 100% match on your stake up to 10k $BONSAI
          </p>
        </div>
        <p className="text-secondary/80">
          Share your referral link to earn rewards.
        </p>

        <Copy title="" text={referralLink} link={referralLink} />
      </div>
    </div>
  );
};
