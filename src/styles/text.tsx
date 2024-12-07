import clsx from 'clsx';
import { ReactNode } from 'react';

interface TextProps {
    className?: string;
    children: ReactNode;
}

export const Header2 = (props: TextProps) => {
    return (
        <p className={clsx("font-semibold text-secondary text-2xl", props.className)}>
            {props.children}
        </p>
    );
}

export const Subtitle = (props: TextProps) => {
    return (
        <p className={clsx("text-sm leading-4 text-footer", props.className)}>
            {props.children}
        </p>
    );
}