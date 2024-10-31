
interface CoinbasePayButtonProps {
    isLoading: boolean;
    onPressed: () => void;
}

const CoinbasePayButton = (props: CoinbasePayButtonProps) => {
    const { isLoading, onPressed } = props;
    return (
        <button
            disabled={isLoading}
            onClick={onPressed}
            className="cursor-pointer text-white rounded-[8px] hover:opacity-90 coinbaseButton" aria-label="Crypto"
        >
            <img src="/rasters/cbpay.png" alt="Coinbase" className="h-[40px]" />
        </button>
    )
}

export default CoinbasePayButton