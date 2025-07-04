// @ts-nocheck
import { Dialog, Transition } from "@headlessui/react";
import { XIcon } from "@heroicons/react/outline";
import useIsMobile from "@src/hooks/useIsMobile";
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

export const Modal: FC<ModalProps> = ({ open, onClose, setOpen, children, panelClassnames, static: isStatic, transitionProps, disableAnimation = false }) => {
  const isMobile = useIsMobile();

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-[1002]"
        onClose={isStatic ? () => {} : onClose}
        static={isStatic}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-true-black/70 backdrop-blur-[1px] bg-opacity-10 transition-opacity" />
        </Transition.Child>

        <div className="fixed z-[1000] inset-0 overflow-y-auto">
          <div className={`flex min-h-[100dvh] ${isMobile ? 'items-end' : 'items-center'} justify-center p-0 text-center md:p-4`}>
            <Transition.Child
              as={Fragment}
              enter={`transform transition-all ease-in-out duration-150`}
              enterFrom={isMobile ? "opacity-100 translate-y-1/2" : "opacity-0 translate-y-4 scale-95"}
              enterTo={isMobile ? "opacity-100 translate-y-0" : "opacity-100 translate-y-0 scale-100"}
              leave={`transform transition-all ease-in duration-200`}
              leaveFrom={isMobile ? "opacity-100 translate-y-0" : "opacity-100 translate-y-0 scale-100"}
              leaveTo={isMobile ? "opacity-100 translate-y-full" : "opacity-0 translate-y-4 scale-95"}
            >
              <Dialog.Panel
                className={`backdrop-blur-[40px] bg-card relative text-left shadow-xl w-full max-h-[90vh] md:max-h-none md:my-8 md:max-w-lg md:min-w-[512px] overflow-auto h-auto md:p-4
                  ${isMobile ? 'rounded-t-2xl pb-6' : 'rounded-lg'} ${panelClassnames}`
                }
                style={{ viewTransitionName: 'modal' }}
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
