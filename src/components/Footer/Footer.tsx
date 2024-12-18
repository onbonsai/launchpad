import { useRouter } from "next/router";
import Twitter from "@mui/icons-material/Twitter";
import Link from "next/link";
import { cx } from "@src/utils/classnames";
import { routesApp } from "@src/constants/routesApp";
import clsx from "clsx";

const links = [
  {
    href: routesApp.hooks,
    label: "Uniswap v4 Hooks"
  },
  {
    href: routesApp.help,
    label: "FAQ"
  },
];

interface FooterProps {
  links: {
    name: string;
    href: string;
  }[]
}

export const Footer = (props: FooterProps) => {
  const { route } = useRouter();

  if (route.includes("post/")) return null;

  return (
    <footer className="flex justify-end pr-4 pb-4 bg-transparent w-full md:mt-24 gap-2">
      {props.links.map((link, index) => (
        <>
          <a key={index} href={link.href} className={clsx("text-sm text-white hover:text-white/80")}>{link.name}</a>
          {(index < (props.links.length - 1)) && <span className="text-sm text-white">|</span>}
        </>
      ))}
    </footer>
  );
};
