import { Button } from "@src/components/Button";
import { Modal } from "@src/components/Modal";
import React, { useState } from 'react'
import TradeComponent from "./TradeComponent";

interface BuySellModalProps {
    club: any;
    address: string;
    open: boolean;
    buyAmount?: string;
    onClose: () => void;
    onBuyUSDC?: (amount: string, amountNeeded: number) => void;
    mediaProtocolFeeRecipient?: `0x${string}`;
    useRemixReferral?: `0x${string}`;
    postId?: string;
}

const BuySellModal = (props: BuySellModalProps) => {
    const { club, buyAmount, address, open, onClose, onBuyUSDC, mediaProtocolFeeRecipient, useRemixReferral, postId } = props;
    return (
        <Modal
            onClose={onClose}
            open={open}
            setOpen={() => { }}
            panelClassnames="text-md bg-card w-full p-4 md:w-[35vw] max-w-[2000px] lg:max-w-[500px] text-secondary md:mx-8"
        >
            <TradeComponent
                defaultBuyAmount={buyAmount ?? ''}
                club={club}
                address={address as `0x${string}`}
                onBuyUSDC={(amount, amountNeeded) => onBuyUSDC?.(amount, amountNeeded)}
                mediaProtocolFeeRecipient={mediaProtocolFeeRecipient}
                useRemixReferral={useRemixReferral}
                closeModal={onClose}
                postId={postId}
            />
        </Modal>
    )
}

export default BuySellModal;