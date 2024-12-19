import { useRouter } from "next/router";
import clsx from "clsx";


const links = [
  {name: "Info", href: "/info"},
  {name: "Privacy Policy", href: "/privacy-policy"},
  {name: "Terms & Conditions", href: "/tos"},
  {name: "x.com", href: "https://x.com/bonsaitoken404"},
  // {name: "Uni v4 hooks", href: "/hooks"},
];

export const Footer = () => {
  const { route } = useRouter();

  return (
    <footer className="flex justify-end pr-4 pb-4 bg-transparent w-full md:mt-32 gap-2">
      {links.map((link, index) => (
        <div key={`footer-${index}`}>
          <a  href={link.href} className={clsx("text-sm text-white/70 hover:text-white/80")}>{link.name}</a>
          {(index < (links.length - 1)) && <span className="text-sm text-white ml-2 ">|</span>}
        </div>
      ))}
    </footer>
  );
};
