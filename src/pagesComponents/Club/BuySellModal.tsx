import { Button } from "@src/components/Button";
import { Modal } from "@src/components/Modal";
import React, { useState } from 'react'
import { TradeComponent } from "./TradeComponent";

interface BuySellModalProps {
    club: any;
    address: string;
    open: boolean;
    onClose: () => void;
}

const BuySellModal = (props: BuySellModalProps) => {
    const { club, address, open, onClose } = props;
    return (
        <Modal
            onClose={() => onClose()}
            open={open}
            setOpen={() => { }}
            panelClassnames="w-screen h-screen md:h-full md:w-fit p-4 text-secondary"
        >
            <TradeComponent club={club} address={address} />
        </Modal>
    )
}

export default BuySellModal;