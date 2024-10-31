import { cx } from '@src/utils/classnames';
import Link from 'next/link';
import React from 'react'

interface HeaderButtonProps {
    label: string;
    href: string;
    active: boolean
}

const HeaderButton = (props: HeaderButtonProps) => {
    const { label, href, active } = props;
    return (
        <div className={cx("h-[40px] py-[10px] px-4 flex justify-center items-center rounded-lg hover:opacity-80 hover:cursor-pointer", active ? "bg-button" : "")}>
            <Link
                key={href}
                href={href}
                passHref
                className={cx(
                    "h-full leading-4",
                    `font-medium text-white text-[16px]  hover:opacity-100 tour__${label.toLowerCase()}`,
                )}
            >
                {label}
            </Link>
        </div>
    )
}

export default HeaderButton