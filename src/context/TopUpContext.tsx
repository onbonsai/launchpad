import { createContext, useContext, useState, ReactNode } from "react";
import { Modal } from "@src/components/Modal";
import dynamic from "next/dynamic";

const TopUpModal = dynamic(() => import("@src/components/Publication/TopUpModal").then((mod) => mod.TopUpModal), {
  loading: () => (
    <div className="flex items-center justify-center w-full h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
    </div>
  ),
  ssr: false,
});

interface TopUpModalContextType {
  openTopUpModal: (requiredAmount?: bigint) => void;
  closeTopUpModal: () => void;
}

const TopUpModalContext = createContext<TopUpModalContextType | undefined>(undefined);

export const TopUpModalProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [requiredAmount, setRequiredAmount] = useState<bigint | undefined>(undefined);

  const openTopUpModal = (amount?: bigint) => {
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
        panelClassnames="w-screen h-screen md-plus:h-full p-4 text-secondary"
        static
      >
        <TopUpModal requiredAmount={requiredAmount} />
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
