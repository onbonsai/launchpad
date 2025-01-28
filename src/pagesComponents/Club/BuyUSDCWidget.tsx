import { Button } from "@src/components/Button";
import { Modal } from "@src/components/Modal";
import React, { useState } from 'react'
import { TradeComponent } from "./TradeComponent";
import BuyUSDCModal from "@src/components/BuyUSDC/BuyUSDCModal";

interface BuySellModalProps {
    open: boolean;
    buyAmount: number;
    onClose: () => void;
}

const BuyUSDCWidget = (props: BuySellModalProps) => {
    const { open, buyAmount, onClose } = props;
    return (
        <Modal
            onClose={() => onClose()}
            open={open}
            setOpen={() => { }}
            panelClassnames="w-screen h-screen md:h-full md:w-fit p-4 text-secondary"
        >
            <BuyUSDCModal buyAmount={buyAmount} />
        </Modal>
    )
}

export default BuyUSDCWidget;