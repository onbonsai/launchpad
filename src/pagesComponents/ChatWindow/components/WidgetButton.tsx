"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@src/components/Button"
import clsx from "clsx";
import { AgentInfo } from "@src/services/madfi/terminal";

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

export default function WidgetButton({ children, agentInfo }: { children: React.ReactNode, agentInfo: AgentInfo }) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleChat = () => {
    setIsOpen(!isOpen)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window Container - Styling adapted from Balance.tsx / Chat.tsx */}
      <div
        className={clsx(
          "bg-dark-grey border border-zinc-700 rounded-lg shadow-lg mb-4 w-80 sm:w-96 overflow-hidden transition-all duration-300 ease-in-out flex flex-col", // Use theme colors
          isOpen ? "opacity-100 max-h-[500px] translate-y-0" : "opacity-0 max-h-0 translate-y-10 pointer-events-none",
        )}
        style={{
          transformOrigin: "bottom right",
        }}
      >
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center space-x-2">
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
        <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: "400px" }}>
          {isOpen && children}
        </div>

        {/* Removed Chat Input Section */}
      </div>

      {/* Chat Toggle Button - Styling adapted */}
      <Button
        onClick={toggleChat}
        variant="primary"
        className={clsx(
          "h-14 w-14 rounded-full shadow-lg transition-all duration-300",
          isOpen ? "bg-dark-grey hover:bg-dark-grey/80" : "bg-dark-grey hover:bg-dark-grey/80",
        )}
      >
        <div className="flex items-center justify-center">
          {isOpen ? <XIcon size={24} className="text-white" /> : <span className="bonsaiLogo -mt-1" />}
        </div>
      </Button>
    </div>
  )
}
