import { Button } from "@src/components/Button";
import { Modal } from "@src/components/Modal";
import React, { useState } from 'react'
import { TradeComponent } from "./TradeComponent";

interface BuySellModalProps {
    club: any;
    address: string;
    open: boolean;
    buyAmount?: string;
    onClose: () => void;
    onBuyUSDC?: (amount: string, amountNeeded: number) => void;
    mediaProtocolFeeRecipient?: `0x${string}`;
}

const BuySellModal = (props: BuySellModalProps) => {
    const { club, buyAmount, address, open, onClose, onBuyUSDC, mediaProtocolFeeRecipient } = props;
    return (
        <Modal
            onClose={() => onClose()}
            open={open}
            setOpen={() => { }}
            panelClassnames="w-screen h-screen md:h-full md:w-fit p-4 text-secondary"
        >
            <TradeComponent
                defaultBuyAmount={buyAmount ?? ''}
                club={club}
                address={address}
                onBuyUSDC={onBuyUSDC}
                mediaProtocolFeeRecipient={mediaProtocolFeeRecipient}
            />
        </Modal>
    )
}

export default BuySellModal;