import { useEffect, useState } from "react";
import { Popper, ClickAwayListener } from "@mui/material";
import { Button } from "@src/components/Button";
import { Subtitle } from "@src/styles/text";
import clsx from "clsx";
import { brandFont } from "@src/fonts/fonts";

const ImportTemplatesModal = ({ onSubmit, anchorEl, onClose }) => {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(url);
    onClose();
  };

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  return (
    <Popper open={Boolean(anchorEl)} anchorEl={anchorEl} placement="bottom-start" style={{ zIndex: 1400 }}>
      <ClickAwayListener onClickAway={onClose}>
        <div
          className={clsx("mt-2 bg-dark-grey p-4 rounded-lg shadow-lg w-[350px] space-y-4", brandFont.className)}
          style={{
            fontFamily: brandFont.style.fontFamily,
          }}
        >
          <div className="items-center justify-center text-left space-y-2">
            <Subtitle>Import templates from another ElizaOS server</Subtitle>
            <p className="text-xs text-secondary/40">Note: Bonsai does not guarantee the content of 3rd party templates. Use at your own disgression.</p>
          </div>
          <form onSubmit={handleSubmit} className="flex items-center gap-x-4">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="bg-card-light w-[225px] rounded-lg text-white text-[16px] tracking-[-0.02em] leading-5 placeholder:text-secondary/70 border-transparent focus:border-transparent focus:ring-dark-grey sm:text-sm"
              placeholder="https://"
            />
            <Button
              size="md"
              variant="accentBrand"
              className="text-base font-bold rounded-lg gap-x-1 md:px-2 py-[10px]"
              type="submit"
            >
              Import
            </Button>
          </form>
        </div>
      </ClickAwayListener>
    </Popper>
  );
};

export default ImportTemplatesModal;
