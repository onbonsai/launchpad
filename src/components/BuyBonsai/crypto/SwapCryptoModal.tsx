import { ChainId } from '@decent.xyz/box-common';
import { SwapModal } from '@decent.xyz/the-box';
import { useEffect } from 'react';
import { useAccount } from 'wagmi';

import { configureChainsConfig } from "@utils/wagmi";

import { bonsaiToken, matic } from './Models';

interface SwapCryptoModalProps {
    onClose: () => void;
}

const SwapCryptoModal = (props: SwapCryptoModalProps) => {
    const { onClose } = props;
    const { address, isConnected } = useAccount();

    useEffect(() => {
        setTimeout(() => {
            const div = document.createElement('div');
            div.className = 'absolute top-[20px] right-[16px]';

            const button = document.createElement('button');
            button.className = 'w-[24px] h-[24px] flex justify-center items-center';
            button.innerHTML = 'x';
            button.onclick = () => onClose();
            div.appendChild(button);

            const divWithClass = document.getElementsByClassName('box-swap-modal')[0];
            if (!divWithClass) return;
            divWithClass.appendChild(div);
        }, 1);
    }, []);

    return (
        <div
            className='fixed top-0 left-0 right-0 bottom-0 flex justify-center items-center bg-black bg-opacity-75 buyBonsaiWrapper '
            onClick={onClose}
        >
            <div onClick={(e) => e.stopPropagation()} className='bg-white buyBonsaiSelectorBox'>
                <SwapModal
                    apiKey={process.env.NEXT_PUBLIC_DECENT_API_KEY ?? ''}
                    wagmiConfig={configureChainsConfig}
                    selectedDstToken={{
                        chainId: ChainId.POLYGON,
                        tokenInfo: bonsaiToken,
                    }}
                    selectedSrcToken={{
                        chainId: ChainId.POLYGON,
                        tokenInfo: matic,
                    }}
                    onConnectWallet={() => { }}
                    popularTokens={[bonsaiToken]}
                    chainIds={[ChainId.POLYGON, ChainId.ETHEREUM, ChainId.BASE]}
                    receiverAddress={address}
                />
            </div>
        </div>
    )
}

export default SwapCryptoModal