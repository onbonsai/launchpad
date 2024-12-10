import { Subtitle } from "@src/styles/text";


interface HoldingsHeaderProps {
    title: string;
    count: number;
}

const RightCaret = ({ size = 24, color = 'currentColor', className = '' }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        fill="none"
        viewBox="0 0 24 24"
        className={className}
    >
        <title>Right arrow</title>
        <path
            d="M8 5l8 7-8 7"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);


const HoldingsHeader = (props: HoldingsHeaderProps) => {
    const { title, count } = props;
    return (
        <div className='flex space-x-1 items-center text-white/70'>
            <Subtitle>{title}</Subtitle>
            <div className='flex bg-card rounded-md justify-center items-center h-4 px-1 py-[2.5px]'>
                <p className='text-[12px] leading-[1.2] font-medium'>
                    {count}
                </p>
            </div>
            <RightCaret size={10} color='rgba(255, 255, 255, 0.7)' />
        </div>
    )
}

export default HoldingsHeader