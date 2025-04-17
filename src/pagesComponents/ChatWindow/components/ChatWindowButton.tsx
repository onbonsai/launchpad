"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@src/components/Button"
import clsx from "clsx";
import { AgentInfo } from "@src/services/madfi/terminal";
import { useAccount } from "wagmi";

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

export default function ChatWindowButton({ children, agentInfo }: { children: React.ReactNode, agentInfo: AgentInfo }) {
  const { isConnected } = useAccount();
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, setIsOpen]);

  const toggleChat = () => {
    setIsOpen(!isOpen)
  }

  return (
    <div className="fixed md:bottom-6 md:right-6 bottom-2 right-2 z-50 flex flex-col items-end">
      {/* Chat Window Container - Styling adapted from Balance.tsx / Chat.tsx */}
      <div
        className={clsx(
          "bg-background border border-dark-grey rounded-lg shadow-lg mb-4 w-80 sm:w-96 overflow-hidden transition-all duration-300 ease-in-out flex flex-col",
          isOpen ? "opacity-100 max-h-[500px] translate-y-0" : "opacity-0 max-h-0 translate-y-10 pointer-events-none",
        )}
        style={{
          transformOrigin: "bottom right",
        }}
      >
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center space-x-4">
            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center">
              <img
                src={agentInfo.account?.metadata?.picture?.uri || "/default.png"}
                alt="Agent avatar"
                className="h-full w-full rounded-full object-cover"
              />
            </div>
            <h3 className="font-medium text-white">Chat with {agentInfo.account?.metadata?.name || `@${agentInfo.account?.username?.localName}`}</h3>
          </div>
        </div>

        {/* Chat Content Area - Render children (Chat component) here */}
        <div className="flex-1 overflow-y-auto pt-4 pr-4 pl-4 pb-2" style={{ maxHeight: "400px" }}>
          {isOpen && children}
        </div>
      </div>

      {isConnected && (
        <Button
          onClick={toggleChat}
          variant="primary"
          className={clsx(
            "h-14 w-14 rounded-full shadow-lg transition-all duration-300",
            "bg-background border border-dark-grey hover:bg-background shining-border",
          )}
        >
          <div className="flex items-center justify-center">
            {isOpen ? <XIcon size={24} className="text-white" /> : <span className="bonsaiLogoPattern -mt-2" />}
          </div>
        </Button>
      )}
    </div>
  )
}
