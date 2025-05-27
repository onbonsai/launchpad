"use client";

import React, { useEffect, useState, useContext } from "react";
import { Button } from "@src/components/Button";
import clsx from "clsx";
import { AgentInfo } from "@src/services/madfi/terminal";
import { useAccount } from "wagmi";
import Image from "next/image";
import useIsMobile from "@src/hooks/useIsMobile";
import { ChatSidebarContext } from "@src/components/Layouts/Layout/Layout";
import { SwapCalls } from "@mui/icons-material";

interface ChatWindowButtonProps {
  children: React.ReactElement<{ isRemixing?: boolean }>;
  agentInfo: AgentInfo;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isRemixing?: boolean;
}

const XIcon = ({ size = 24, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={clsx(`w-${size / 4} h-${size / 4}`, className)}
  >
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

export default function ChatWindowButton({
  children,
  agentInfo,
  isOpen,
  setIsOpen,
  isRemixing = false,
}: ChatWindowButtonProps) {
  const { isConnected } = useAccount();
  const isMobile = useIsMobile();
  const { isRemixing: contextIsRemixing, setIsRemixing } = useContext(ChatSidebarContext);
  const [isRemixingState, setIsRemixingState] = useState(isRemixing || contextIsRemixing);

  useEffect(() => {
    if (!isOpen) {
      setIsRemixingState(false);
      setIsRemixing(false);
    }
  }, [isOpen, setIsRemixing]);

  useEffect(() => {
    if (contextIsRemixing) {
      setIsRemixingState(true);
    }
  }, [contextIsRemixing]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, setIsOpen]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleRemix = () => {
    setIsRemixingState(true);
    setIsRemixing(true);
    setIsOpen(true);
  };

  // Clone children and pass isRemixing prop
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { isRemixing: isRemixingState });
    }
    return child;
  });

  return (
    <>
      {/* Chat Window */}
      <div
        className={clsx(
          "fixed top-0 right-0 h-full w-80 sm:w-96 bg-black overflow-hidden flex flex-col z-40",
          "pointer-events-auto transition-all duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
        style={{
          transformOrigin: "right",
          boxShadow: "inset 16px 0 32px -8px rgba(0,0,0,0.45)",
        }}
      >
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center">
              <Image
                src={agentInfo.account?.metadata?.picture || "/default.png"}
                alt="Agent avatar"
                className="h-full w-full rounded-full object-cover"
                width={40}
                height={40}
              />
            </div>
            <div className="flex flex-col">
              <h3 className="font-medium text-white">
                Chat with {agentInfo.account?.metadata?.name || `@${agentInfo.account?.username?.localName}`}
              </h3>
              <span className="text-sm text-white/60">Explore the reality of the post or remix it</span>
            </div>
          </div>
          {/* Close Button in Header */}
          <button onClick={toggleChat} className="ml-2 p-1 rounded hover:bg-zinc-800 transition-colors">
            <XIcon size={24} className="text-white" />
          </button>
        </div>
        {/* Chat Content Area - Render children (Chat component) here */}
        <div className="flex-1 overflow-y-auto pt-4 pr-4 pl-4 pb-2">{isOpen && childrenWithProps}</div>
      </div>

      {/* Floating Open Button - Desktop */}
      {/* {isConnected && !isOpen && !isMobile && (
        <div className="fixed bottom-6 right-6 z-50 pointer-events-auto">
          <Button
            onClick={toggleChat}
            variant="primary"
            className={clsx(
              "h-14 w-14 rounded-full shadow-lg transition-all duration-300",
              "bg-background border border-dark-grey hover:bg-background shining-border",
            )}
          >
            <div className="flex items-center justify-center">
              <span className="bonsaiLogoPattern -mt-2" />
            </div>
          </Button>
        </div>
      )} */}

      {/* Mobile Bottom Bar */}
      {isConnected && !isOpen && isMobile && (
        <div className="fixed bottom-16 left-0 right-0 bg-black border-t border-dark-grey z-50 pointer-events-auto">
          <div className="flex justify-between items-center px-4 py-3">
            {/* <Button
              onClick={toggleChat}
              variant="primary"
              size="sm"
              className="flex-1 mr-2 bg-background border border-dark-grey hover:bg-background"
            >
              Chat
            </Button> */}
            <Button
              onClick={handleRemix}
              variant="accentBrand"
              size="sm"
              className="flex-1 ml-2 bg-background border border-dark-grey hover:bg-background"
            >
              <SwapCalls className="h-5 w-5 mr-2" />
              Remix
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
