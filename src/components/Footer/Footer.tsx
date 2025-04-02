import clsx from "clsx";

const links = [
  { name: "Info", href: "/info" },
  { name: "Hooks", href: "/hooks" },
  { name: "Orb", href: "https://orb.club/c/bonsai" },
  { name: "X / Twitter", href: "https://x.com/onbonsai" },
  // { name: "Uni v4 hooks", href: "/hooks" },
];

const legal = [
  { name: "Privacy Policy", href: "/privacy-policy" },
  { name: "Terms & Conditions", href: "/tos" },
];

interface FooterProps {
  short?: boolean;
}

export const Footer = (props: FooterProps) => {
  const { short } = props;
  return (
    <footer className={clsx(short ? `md:mt-4` : `md:mt-32`)}>
      <div className="flex justify-end pr-4 bg-transparent w-full gap-2">
        {links.map((link, index) => (
          <div key={`footer-${index}`}>
            <a href={link.href} className={clsx("text-sm text-white/70 hover:text-white/80")}>
              {link.name}
            </a>
            {index < links.length - 1 && <span className="text-sm text-white ml-2 ">|</span>}
          </div>
        ))}
      </div>
      <div className="flex justify-end pr-4 pb-4 bg-transparent w-full gap-2 opacity-70">
        {legal.map((link, index) => (
          <div key={`footer-${index}`}>
            <a href={link.href} className={clsx("text-sm text-white/70 hover:text-white/80")}>
              {link.name}
            </a>
            {index < legal.length - 1 && <span className="text-sm text-white ml-2 ">|</span>}
          </div>
        ))}
      </div>
    </footer>
  );
};
