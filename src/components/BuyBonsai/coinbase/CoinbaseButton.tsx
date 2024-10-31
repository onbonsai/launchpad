import type { CBPayInstanceType } from '@coinbase/cbpay-js';
import { initOnRamp } from '@coinbase/cbpay-js';
import { useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';

import CoinbasePayButton from './CoinbasePayButton';

interface CoinbaseButtonProps {
    onClose: () => void;
    onSuccess: () => void;
}

const CoinbaseButton = (props: CoinbaseButtonProps) => {
    const { onClose, onSuccess } = props;
    const { address } = useAccount()

    const onrampInstance = useRef<CBPayInstanceType | undefined>();

    useEffect(() => {
        if (onrampInstance.current) {
            onrampInstance.current.destroy();
        }

        initOnRamp({
            appId: process.env.NEXT_PUBLIC_COINBASE_PAY_APP_ID!,
            widgetParameters: {
                destinationWallets: [
                    {
                        address: address ?? '0x0',
                        blockchains: ['polygon'],
                        supportedNetworks: ['polygon'],
                        assets: ['MATIC'],
                    },
                ],
                defaultNetwork: 'polygon',
                defaultAsset: 'MATIC',
            },
            onSuccess: () => {
                onSuccess();
            },
            onExit: () => {
                onClose();
            },
            onEvent: (event) => {
                console.log('CB: event', event);
                if (event.eventName === 'transition_view' && event.pageRoute === '/buy/initiating-purchase') {
                    onSuccess();
                }
            },
            experienceLoggedIn: 'popup',
            experienceLoggedOut: 'popup',
            closeOnExit: true,
            closeOnSuccess: true,
        }, (_, instance) => {
            if (instance) {
                onrampInstance.current = instance;
            }
        });

        return () => {
            onrampInstance?.current?.destroy();
            onrampInstance.current = undefined;
        };
    }, [address]);

    const handleClick = () => {
        onrampInstance?.current?.open();
    };

    return <CoinbasePayButton onPressed={handleClick} isLoading={!onrampInstance} />;
};

export default CoinbaseButton;