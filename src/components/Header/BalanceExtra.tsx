"use client"

import { useState } from "react"
import { ChevronDown, Copy, Gift } from "lucide-react"
import Image from "next/image";

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"

interface WalletBalanceModalProps {
  mainWallet: {
    address: string
    balance: string
    icon: string
  }
  connectedWallet?: {
    address: string
    balance: string
    icon: string
  }
  username: string
  userIcon: string
}

export default function WalletBalanceModal({
  mainWallet,
  connectedWallet,
  username,
  userIcon,
}: WalletBalanceModalProps) {
  const [isOpen, setIsOpen] = useState(false)

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="font-sans">
      <div className="flex items-center justify-between p-4 bg-black text-white">
        <div className="flex items-center gap-2 bg-zinc-900 p-3 rounded-md">
          <div className="flex">
            <Image src={mainWallet.icon || "/placeholder.svg"} alt="Main wallet" className="w-6 h-6 rounded-full" width={24} height={24} />
            {connectedWallet && (
              <Image
                src={connectedWallet.icon || "/placeholder.svg"}
                alt="Connected wallet"
                className="w-6 h-6 rounded-full -ml-2"
                width={24}
                height={24}
              />
            )}
          </div>
          <span className="text-2xl font-bold">{mainWallet.balance}</span>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              className="bg-zinc-900 hover:bg-zinc-800 text-white flex items-center gap-2 p-3 rounded-md"
            >
              <Image src={userIcon || "/placeholder.svg"} alt={username} className="w-6 h-6 rounded-full" width={24} height={24} />
              <span>{username}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-white p-6 max-w-md">
            <div className="space-y-6">
              {/* Main Wallet Section - More Prominent */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Image
                      src={mainWallet.icon || "/placeholder.svg"}
                      alt="Main wallet"
                      className="w-8 h-8 rounded-full"
                      width={32}
                      height={32}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-zinc-400">Main Wallet</h3>
                        <span className="text-xs font-mono text-zinc-500">{truncateAddress(mainWallet.address)}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 hover:bg-zinc-700 p-0"
                          onClick={() => copyToClipboard(mainWallet.address)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="bg-zinc-800 hover:bg-zinc-700 border-zinc-700">
                    Manage
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="bg-zinc-800 p-3 rounded-md flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Image src="/placeholder.svg?height=16&width=16" alt="Token 1" className="w-4 h-4 rounded-full" width={16} height={16} />
                      <span className="text-sm text-zinc-400">ETH</span>
                    </div>
                    <p className="text-lg font-bold">{mainWallet.balance}</p>
                  </div>
                  <div className="bg-zinc-800 p-3 rounded-md flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Image src="/placeholder.svg?height=16&width=16" alt="Token 2" className="w-4 h-4 rounded-full" width={16} height={16} />
                      <span className="text-sm text-zinc-400">USDC</span>
                    </div>
                    <p className="text-lg font-bold">$12.5k</p>
                  </div>
                </div>
              </div>

              {/* Connected Wallet Section - Less Prominent */}
              {connectedWallet && (
                <div className="space-y-4 pt-4 border-t border-zinc-800 mt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Image
                        src={connectedWallet.icon || "/placeholder.svg"}
                        alt="Connected wallet"
                        className="w-6 h-6 rounded-full"
                        width={24}
                        height={24}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-xs text-zinc-400">Connected Wallet</h3>
                          <span className="text-xs font-mono text-zinc-500">
                            {truncateAddress(connectedWallet.address)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 hover:bg-zinc-700 p-0"
                            onClick={() => copyToClipboard(connectedWallet.address)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
                      Disconnect
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="bg-zinc-800 p-2 rounded-md flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Image src="/placeholder.svg?height=16&width=16" alt="Token 1" className="w-3 h-3 rounded-full" width={12} height={12} />
                        <span className="text-xs text-zinc-400">ETH</span>
                      </div>
                      <p className="text-base font-bold">{connectedWallet.balance}</p>
                    </div>
                    <div className="bg-zinc-800 p-2 rounded-md flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Image src="/placeholder.svg?height=16&width=16" alt="Token 2" className="w-3 h-3 rounded-full" width={12} height={12} />
                        <span className="text-xs text-zinc-400">USDC</span>
                      </div>
                      <p className="text-base font-bold">$0.8k</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Referrals Button */}
              <Button className="w-full bg-green-100/20 hover:bg-green-100/30 text-black flex items-center justify-center gap-2 py-6">
                <Gift className="h-5 w-5" />
                <span className="text-lg font-medium">Referrals</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
