import clsx from 'clsx';
import { ReactNode } from 'react';

interface TextProps {
    className?: string;
    children: ReactNode;
}

export const Header = (props: TextProps) => {
    return (
        <p className={clsx("font-semibold text-secondary text-[32px] leading-[1.125] tracking-[-0.03em]", props.className)}>
            {props.children}
        </p>
    );
}

export const Header2 = (props: TextProps) => {
    return (
        <p className={clsx("font-semibold text-secondary text-2xl leading-7", props.className)}>
            {props.children}
        </p>
    );
}

export const BodySemiBold = (props: TextProps) => {
    return (
        <p className={clsx("text-base leading-5 font-semibold", props.className)}>
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

export const SmallSubtitle = (props: TextProps) => {
    return (
        <p className={clsx("text-[10px] leading-[1.2] text-white/40", props.className)}>
            {props.children}
        </p>
    );
}