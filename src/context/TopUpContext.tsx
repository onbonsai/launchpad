import { createContext, useContext, useState, ReactNode } from "react";
import { Modal } from "@src/components/Modal";
import dynamic from "next/dynamic";

const TopUpModal = dynamic(() => import("@src/components/TopUp/TopUpModal").then((mod) => mod.TopUpModal), {
  loading: () => (
    <div className="flex items-center justify-center w-full h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
    </div>
  ),
  ssr: false,
});

const ApiCreditsModal = dynamic(
  () => import("@src/components/TopUp/ApiCreditsModal").then((mod) => mod.ApiCreditsModal),
  {
    loading: () => (
      <div className="flex items-center justify-center w-full h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    ),
    ssr: false,
  },
);

type ModalType = "topup" | "api-credits";

interface TopUpModalContextType {
  openTopUpModal: (type?: ModalType, requiredAmount?: bigint) => void;
  closeTopUpModal: () => void;
}

const TopUpModalContext = createContext<TopUpModalContextType | undefined>(undefined);

export const TopUpModalProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [requiredAmount, setRequiredAmount] = useState<bigint | undefined>(undefined);
  const [modalType, setModalType] = useState<ModalType>("topup");

  const openTopUpModal = (type: ModalType = "topup", amount?: bigint) => {
    setModalType(type);
    setRequiredAmount(amount);
    setIsOpen(true);
  };

  const closeTopUpModal = () => {
    setIsOpen(false);
    setRequiredAmount(undefined);
  };

  return (
    <TopUpModalContext.Provider value={{ openTopUpModal, closeTopUpModal }}>
      {children}
      <Modal
        onClose={closeTopUpModal}
        open={isOpen}
        setOpen={setIsOpen}
        panelClassnames="w-full max-w-full md:max-w-[40vw] max-h-[100dvh] overflow-y-auto p-0 text-secondary bg-background flex flex-col"
        static
      >
        {modalType === "topup" ? (
          <TopUpModal requiredAmount={requiredAmount} />
        ) : (
          <div className="flex-1 overflow-y-auto">
            <ApiCreditsModal />
          </div>
        )}
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
