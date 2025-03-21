"use client"

import { Header, Header2 } from "@src/styles/text"
import { Button } from "@src/components/Button"
import Link from "next/link"
import clsx from "clsx"
import { useAuthenticatedLensProfile } from "@src/hooks/useLensProfile"
import { formatStakingAmount, useStakingData } from "@src/hooks/useStakingData"
import { useAccount } from "wagmi"
import { useMemo } from "react"
import { kFormatter } from "@src/utils/utils"
import { Divider } from "@mui/material"
const StudioSidebar = () => {
  const { address } = useAccount();
  const { data: authenticatedProfile } = useAuthenticatedLensProfile();
  const { data: stakingData, isLoading: isLoadingStaking } = useStakingData(address);

  const totalStaked = useMemo(() => {
    if (!stakingData?.summary?.totalStaked) return "0";
    return formatStakingAmount(stakingData.summary.totalStaked);
  }, [stakingData?.summary]);

  const profileDisabled = !authenticatedProfile?.username?.localName;

  const menuItems = [
    { icon: null, label: "Create a Post", href: "/studio/create", disabled: false },
    { icon: null, label: "Profile", href: `/profile/${authenticatedProfile?.username?.localName}`, disabled: profileDisabled },
    { icon: null, label: "Bonsai Token", href: "/studio/token", disabled: false },
  ]

  return (
    <div className="flex flex-col w-full lg:w-64 bg-card rounded-xl p-4 sticky top-24 overflow-hidden" >
      {/* Main Navigation */}
      <nav className="space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.label}
            href={item.disabled ? "#" : item.href}
            className={clsx(
              "flex items-center px-3 py-2 rounded-lg transition-colors",
              item.disabled
                ? "text-secondary/50 cursor-not-allowed"
                : "text-secondary hover:text-primary hover:bg-card-light"
            )}
            onClick={e => {
              if (item.disabled) {
                e.preventDefault();
              }
            }}
          >
            {/* <item.icon className="h-5 w-5 mr-3" /> */}
            <span className="text-sm">[ICON] {item.label}</span>
          </Link>
        ))}
      </nav>

      <Divider className="my-4" sx={{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }} />

      {/* Recent Posts */}
      <div className="mt-2">
        <Header2 className="text-lg">Recent Posts</Header2>
        <nav className="mt-2 space-y-1">
          <Link
            href="/studio/post/1"
            className="block px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-card-light rounded-lg transition-colors opacity-80"
          >
            Post Title 1 [disable updates]
          </Link>
          <Link
            href="/studio/post/2"
            className="block px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-card-light rounded-lg transition-colors opacity-80"
          >
            Post Title 2
          </Link>
        </nav>
      </div>

      <Divider className="my-4" sx={{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }} />

      {/* Bonsai Token Info */}
      <div className="mt-2">
        <Header2 className="text-lg">$BONSAI</Header2>
        <div className="mt-4 space-y-4 px-3">
          <div>
            <p className="text-sm opacity-80">Staking</p>
            <p className="text-secondary mt-1">{kFormatter(totalStaked)}</p>
          </div>
          <div>
            <p className="text-sm  opacity-80">AI Credits (today)</p>
            <p className="text-secondary mt-1">100</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StudioSidebar;