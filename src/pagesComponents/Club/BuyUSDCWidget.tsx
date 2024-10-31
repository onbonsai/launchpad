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
            panelClassnames="text-md bg-card w-full p-4 md:w-[35vw] max-w-[2000px] lg:max-w-[500px] text-secondary md:mx-8"
            disableAnimation
        >
            <BuyUSDCModal buyAmount={buyAmount} closeModal={onClose} chain={chain} />
        </Modal>
    )
}

export default BuyUSDCWidget;