import toast from "react-hot-toast";

interface Props {
  title: string;
  text: string;
  link: string;
  onClickFn?: () => void;
}

const Copy = ({ title, text, link, onClickFn }: Props) => (
  <div className="mt-4 text-center mx-auto">
    <p className="mb-2">{title}</p>
    <div className="flex items-center justify-center">
      <span className="mr-2 border p-2 bg-black rounded-lg text-white/60">
        {text.length > 45 ? `${text.substring(0, 45)}...` : text}
      </span>
      <button
        className="hover:bg-[#3c3e3c] rounded-full pr-2 py-2 flex items-center group"
        onClick={() => {
          if (onClickFn) onClickFn();
          navigator.clipboard.writeText(link);
          toast.success("Copied to clipboard!");
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="w-6 h-6 ml-2 transition-colors group-hover:stroke-brand-highlight"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
          />
        </svg>
      </button>
    </div>
  </div>
);

export default Copy;
