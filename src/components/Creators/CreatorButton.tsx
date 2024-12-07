import clsx from 'clsx';
import React from 'react'

interface CreatorButtonProps {
    image?: string;
    text: string;
    onClick?: () => void;
}

const CreatorButton = (props: CreatorButtonProps) => {
    const { image, text, onClick } = props
    return (
        <div onClick={onClick} className={clsx("flex flex-row gap-[6px] bg-card rounded-lg", onClick ? "hover" : '', image ? 'p-[2px] pr-[8px]' : 'px-2 py-1')}>
            {image && <img
                src={image}
                alt="user"
                className="w-5 h-5 rounded-md"
            />}
            <p className={clsx("text-sm font-medium tracking-[-0.02em]", image ? '' : 'leading-4')}>
                {text}
            </p>
        </div>
    )
}

export default CreatorButton