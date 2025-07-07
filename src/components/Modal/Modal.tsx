// @ts-nocheck
import { Dialog, Transition } from "@headlessui/react";
import { XIcon } from "@heroicons/react/outline";
import useIsMobile from "@src/hooks/useIsMobile";
import { FC, Fragment, HTMLAttributes, ReactNode, useRef, useState, useEffect } from "react";

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
  const panelRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchMove, setTouchMove] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragDistance, setDragDistance] = useState(0);

  // Reset drag state when modal closes
  useEffect(() => {
    if (!open) {
      setTouchStart(null);
      setTouchMove(null);
      setIsDragging(false);
      setDragDistance(0);
    }
  }, [open]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setTouchMove(null);
    setIsDragging(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || !touchStart) return;

    const touch = e.touches[0];
    const currentTouchMove = { x: touch.clientX, y: touch.clientY };
    setTouchMove(currentTouchMove);

    const deltaY = currentTouchMove.y - touchStart.y;
    const deltaX = Math.abs(currentTouchMove.x - touchStart.x);
    
    // Only start dragging if it's primarily a vertical swipe down
    if (deltaY > 10 && deltaY > deltaX) {
      setIsDragging(true);
      setDragDistance(Math.max(0, deltaY));
      
      // Prevent default scrolling when we're dragging
      e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    if (!isMobile || !touchStart || !touchMove) {
      setTouchStart(null);
      setTouchMove(null);
      setIsDragging(false);
      setDragDistance(0);
      return;
    }

    const deltaY = touchMove.y - touchStart.y;
    const deltaX = Math.abs(touchMove.x - touchStart.x);
    
    // Close modal if swipe down distance is more than 100px and it's primarily vertical
    if (deltaY > 100 && deltaY > deltaX) {
      onClose();
    }
    
    // Reset state
    setTouchStart(null);
    setTouchMove(null);
    setIsDragging(false);
    setDragDistance(0);
  };

  // Calculate transform based on drag distance
  const getTransform = () => {
    if (!isDragging || dragDistance === 0) return '';
    return `translateY(${dragDistance}px)`;
  };

  // Calculate opacity based on drag distance
  const getOpacity = () => {
    if (!isDragging || dragDistance === 0) return 1;
    return Math.max(0.3, 1 - (dragDistance / 300));
  };

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
                ref={panelRef}
                className={`backdrop-blur-[40px] bg-card relative text-left shadow-xl w-full max-h-[90vh] md:max-h-none md:my-8 md:max-w-lg md:min-w-[512px] overflow-auto h-auto md:p-4
                  ${isMobile ? 'rounded-t-2xl pb-6' : 'rounded-lg'} ${panelClassnames}`
                }
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={isDragging ? {
                  transform: getTransform(),
                  opacity: getOpacity(),
                  transition: 'none'
                } : {}}
              >
                {/* Swipe indicator for mobile */}
                {isMobile && (
                  <div className="flex justify-center pt-2 pb-2">
                    <div className="w-10 h-1 bg-gray-300 rounded-full" />
                  </div>
                )}
                
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
