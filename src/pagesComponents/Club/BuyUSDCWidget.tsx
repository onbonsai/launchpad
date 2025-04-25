import { Modal } from "@src/components/Modal";
import React from 'react'
import BuyUSDCModal from "@src/components/BuyUSDC/BuyUSDCModal";

interface BuySellModalProps {
    open: boolean;
    buyAmount: string;
    onClose: () => void;
    chain: string;
}

const BuyUSDCWidget = (props: BuySellModalProps) => {
    const { open, buyAmount, onClose, chain } = props;
    return (
        <Modal
            onClose={() => onClose()}
            open={open}
            setOpen={() => { }}
            panelClassnames="w-screen h-screen md:h-full md:w-fit p-4 text-secondary !bg-transparent"
            disableAnimation
        >
            <BuyUSDCModal buyAmount={buyAmount} closeModal={onClose} chain={chain} />
        </Modal>
    )
}

export default BuyUSDCWidget;