import { ComponentPropsWithRef, FC, ReactNode, forwardRef } from "react";
import { VariantProps, cva } from "cva";

const buttonStyles = cva(
  `
  btn rounded-lg transition-colors duration-200 ease-in-out
`,
  {
    variants: {
      variant: {
        primary: "grey-gradient hover-grey-gradient text-black disabled:text-black disabled:hover:text-black",
        secondary: "bg-secondary/90 text-black hover:bg-secondary",
        accent: "bg-primary text-white hover:bg-primary/90",
        info: "bg-white hover:bg-grey-300 text-black border border-solid border-grey-500 hover:border-grey-700 disabled:text-white disabled:hover:text-white",
        "dark-grey": "bg-dark-grey text-white hover:bg-dark-grey/90",
        "accent-disabled": "bg-primary text-white cursor-not-allowed hover:bg-primary",
      },
      disabled: {
        true: "disabled:opacity-75 disabled:pointer-events-auto disabled:cursor-not-allowed",
        false: "",
      },
      hasIcon: {
        true: "gap-2",
      },
      size: {
        sm: "px-4 py-1 min-h-fit h-8 text-sm",
        md: "px-6 py-2 min-h-fit h-10 text-base",
        compact: "px-2 py-2 min-h-fit  text-base",
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
        className={buttonStyles({ variant, className, hasIcon, disabled, size })}
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
