import { createContext, useContext, useState, ReactNode } from "react";
import { Modal } from "@src/components/Modal";
import dynamic from "next/dynamic";
import { useIsMiniApp } from "@src/hooks/useIsMiniApp";
import { PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";

const TopUpModal = dynamic(() => import("@src/components/TopUp/TopUpModal").then((mod) => mod.TopUpModal), {
  loading: () => (
    <div className="flex items-center justify-center w-full h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
    </div>
  ),
  ssr: false,
});

const SwapToGenerateModal = dynamic(
  () => import("@src/components/TopUp/SwapToGenerateModal").then((mod) => mod.SwapToGenerateModal),
  {
    loading: () => (
      <div className="flex items-center justify-center w-full h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    ),
    ssr: false,
  },
);

type ModalType = "topup" | "swap-to-generate";

interface SwapToGenerateConfig {
  token?: {
    symbol: string;
    address: string;
    chain: string;
  };
  postId?: string;
  creditsNeeded: number;
  refetchCredits?: () => void;
  onSuccess?: () => void;
}

interface TopUpModalContextType {
  openTopUpModal: (type?: ModalType, requiredAmount?: bigint, customHeader?: string, customSubheader?: string) => void;
  closeTopUpModal: () => void;
  openSwapToGenerateModal: (config: SwapToGenerateConfig) => void;
}

const TopUpModalContext = createContext<TopUpModalContextType | undefined>(undefined);

export const TopUpModalProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [requiredAmount, setRequiredAmount] = useState<bigint | undefined>(undefined);
  const [modalType, setModalType] = useState<ModalType>("topup");
  const [swapConfig, setSwapConfig] = useState<SwapToGenerateConfig | undefined>(undefined);
  const { isMiniApp } = useIsMiniApp();

  const openTopUpModal = (type: ModalType = "topup", amount?: bigint, header?: string, subheader?: string) => {
    setModalType(type);
    setRequiredAmount(amount);
    setIsOpen(true);
  };

  const openSwapToGenerateModal = (config: SwapToGenerateConfig) => {
    if (!config.token) {
      config.token = {
        symbol: "BONSAI",
        address: PROTOCOL_DEPLOYMENT[isMiniApp ? "base" : "lens"].Bonsai,
        chain: isMiniApp ? "base" : "lens",
      };
    }
    setModalType("swap-to-generate");
    setSwapConfig(config);
    setIsOpen(true);
  };

  const closeTopUpModal = () => {
    setIsOpen(false);
    setRequiredAmount(undefined);
    setSwapConfig(undefined);
  };

  return (
    <TopUpModalContext.Provider value={{ openTopUpModal, closeTopUpModal, openSwapToGenerateModal }}>
      {children}
      <Modal
        onClose={closeTopUpModal}
        open={isOpen}
        setOpen={setIsOpen}
        panelClassnames="w-full max-w-full md:min-w-[632px] max-h-[100dvh] overflow-y-auto p-0 text-secondary bg-background flex flex-col"
        static
      >
        {modalType === "topup" ? (
          <TopUpModal requiredAmount={requiredAmount} />
        ) : modalType === "swap-to-generate" && swapConfig ? (
          <SwapToGenerateModal
            open={isOpen}
            onClose={closeTopUpModal}
            token={swapConfig.token!}
            postId={swapConfig.postId!}
            creditsNeeded={swapConfig.creditsNeeded}
            refetchCredits={swapConfig.refetchCredits}
            onSuccess={() => {
              swapConfig.onSuccess?.();
              closeTopUpModal();
            }}
          />
        ) : null}
      </Modal>
    </TopUpModalContext.Provider>
  );
};

export const useTopUpModal = () => {
  const context = useContext(TopUpModalContext);
  if (context === undefined) {
    throw new Error("useTopUpModal must be used within a TopUpModalProvider");
  }
  return context;
};
