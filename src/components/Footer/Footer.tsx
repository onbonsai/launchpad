import Image from "next/image";
import { useRouter } from "next/router";
import Twitter from "@mui/icons-material/Twitter";
import Link from "next/link";

export const Footer = () => {
  const { route } = useRouter();

  if (route.includes("post/")) return null;

  return (
    <footer className="bg-[#262626] w-full md:mt-24">
      <div className="px-8 md:px-16 py-12 pb-24">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col items-center md:items-start gap-4">
          </div>
          <div className="flex items-center justify-evenly w-full md:w-fit md:gap-8">
            <a target="_blank" rel="noreferrer" href="https://twitter.com/bonsaitoken404">
              <div className="w-14 h-14 flex items-center justify-center">
                <Twitter className="text-secondary text-3xl" />
              </div>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
