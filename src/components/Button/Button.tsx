import { ComponentPropsWithRef, FC, ReactNode, forwardRef } from "react";
import { VariantProps, cva } from "cva";

const buttonStyles = cva(
  `
  btn rounded-lg transition-colors duration-200 ease-in-out
`,
  {
    variants: {
      variant: {
        primary: "bg-button text-white disabled:text-black disabled:hover:text-black",
        secondary: "bg-secondary/90 text-black hover:bg-secondary",
        accent: "bg-white text-black hover:bg-white/90",
        accentBrand: "bg-brand-highlight text-black hover:bg-brand-highlight/80",
        info: "bg-white hover:bg-grey-300 text-black border border-solid border-grey-500 hover:border-grey-700 disabled:text-white disabled:hover:text-white",
        "dark-grey": "bg-dark-grey text-white hover:bg-dark-grey/90",
        "accent-disabled": "bg-brand-highlight text-white cursor-not-allowed hover:bg-brand-highlight",
        blue: "transition-colors bg-[#0891B2] hover:bg-[#0891B2]/60",
      },
      disabled: {
        true: "disabled:opacity-75 disabled:pointer-events-auto disabled:cursor-not-allowed",
        false: "",
      },
      hasIcon: {
        true: "gap-2",
      },
      size: {
        xs: "px-2 py-[4px] min-h-fit h-6 text-base font-medium",
        sm: "px-4 py-[4px] min-h-fit h-8 text-base font-medium",
        md: "px-6 py-2 min-h-fit h-10 text-[16px] leading-5 font-normal",
        compact: "px-2 py-2 min-h-fit text-[16px] leading-5",
      },
    },
    defaultVariants: {
      variant: "primary",
      disabled: false,
    },
  },
);

interface BtnProps {
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
}
type ButtonProps = VariantProps<typeof buttonStyles> & BtnProps & ComponentPropsWithRef<"button">;

export const Button: FC<ButtonProps> = forwardRef(
  (
    { children, className = "", variant = "primary", type = "button", iconStart, iconEnd, onClick, disabled, size },
    forwardRef,
  ) => {
    const hasIcon = iconStart || iconEnd ? true : false;

    return (
      <button
        type={type}
        className={`${buttonStyles({ variant, hasIcon, disabled, size })} ${className}`}
        onClick={onClick}
        disabled={disabled ?? false}
        ref={forwardRef}
      >
        {iconStart && iconStart}
        {children}
        {iconEnd && iconEnd}
      </button>
    );
  },
);

Button.displayName = "Button";
