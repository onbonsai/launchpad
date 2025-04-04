import { ReactNode } from "react";
import { cx } from "@src/utils/classnames";

export const Tooltip = ({
  message,
  children,
  direction = "right",
  classNames,
  disabled = false,
}: {
  message: string;
  children: ReactNode;
  direction?: "right" | "top" | "left" | "bottom";
  classNames?: string;
  disabled?: boolean;
}) => {
  if (disabled) return children;

  return (
    <span
      className={cx(
        "tooltip inline-flex",
        direction === "top"
          ? ""
          : direction === "left"
          ? "tooltip-left"
          : direction === "right"
          ? "tooltip-right"
          : "tooltip-bottom",
        classNames || ""
      )}
      data-tip={message}
    >
      {children}
    </span>
  );
};