// @ts-nocheck
import { Dialog, Transition } from "@headlessui/react";
import { XIcon } from "@heroicons/react/outline";
import { FC, Fragment, HTMLAttributes, ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  setOpen: (open: boolean) => void;
  children: ReactNode;
  panelClassnames?: HTMLAttributes<"div">["className"];
  static?: boolean;
  transitionProps?: {
    enter: string;
    enterFrom: string;
    enterTo: string;
    leave: string;
    leaveFrom: string;
    leaveTo: string;
  };
  disableAnimation?: boolean;
}

const TRANSITION = {
  enter: "ease-out duration-300",
  enterFrom: "opacity-0",
  enterTo: "opacity-100",
  leave: "ease-in duration-200",
  leaveFrom: "opacity-100",
  leaveTo: "opacity-0"
};

export const Modal: FC<ModalProps> = ({ open, onClose, setOpen, children, panelClassnames, static: isStatic, transitionProps = TRANSITION, disableAnimation = false }) => {
  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-150"
        onClose={isStatic ? () => {} : onClose}
        static={isStatic}
      >
        <Transition.Child
          as={Fragment}
          enter={disableAnimation ? "duration-0" : "ease-out duration-300"}
          enterFrom={disableAnimation ? "" : "opacity-0"}
          enterTo={disableAnimation ? "" : "opacity-100"}
          leave={disableAnimation ? "duration-0" : "ease-in duration-200"}
          leaveFrom={disableAnimation ? "" : "opacity-100"}
          leaveTo={disableAnimation ? "" : "opacity-0"}
        >
          <div className={`fixed inset-0 bg-true-black/70 backdrop-blur-[1px] bg-opacity-10 ${!disableAnimation ? 'transition-opacity' : ''}`} />
        </Transition.Child>

        <div className="fixed z-[1000] inset-0 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0 bg-black/70 ">
            <Transition.Child
              as={Fragment}
              enter={disableAnimation ? "duration-0" : "ease-out duration-300"}
              enterFrom={disableAnimation ? "" : "opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"}
              enterTo={disableAnimation ? "" : "opacity-100 translate-y-0 sm:scale-100"}
              leave={disableAnimation ? "duration-0" : "ease-in duration-200"}
              leaveFrom={disableAnimation ? "" : "opacity-100 translate-y-0 sm:scale-100"}
              leaveTo={disableAnimation ? "" : "opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"}
            >
              <Dialog.Panel
                className={`backdrop-blur-[40px] bg-card relative rounded-lg text-left shadow-xl
        ${!disableAnimation ? 'transform transition-all' : ''} sm:my-8 sm:max-w-sm w-full h-fit sm:p-4 md:w-fit
        md:max-w-6xl lg:max-w-6xl ${panelClassnames} overflow-auto`}
              >
                <div className="absolute top-0 right-0 mt-4 mr-4 sm:block z-50">
                  <button
                    type="button"
                    className="cursor-pointer focus-visible:outline-none bg-card-light rounded-[10px] h-7 w-7 flex justify-center items-center"
                    onClick={() => onClose()}
                  >
                    <span className="sr-only">Close</span>
                    <XIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                {children}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};
