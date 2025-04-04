"use client"

import { Header2 } from "@src/styles/text"
import Link from "next/link"
import clsx from "clsx"
import { useAuthenticatedLensProfile } from "@src/hooks/useLensProfile"
import { formatStakingAmount, useStakingData } from "@src/hooks/useStakingData"
import { useAccount } from "wagmi"
import { useMemo } from "react"
import { kFormatter } from "@src/utils/utils"
import PlusCircleIcon from "@heroicons/react/outline/PlusCircleIcon"
import UserIcon from "@heroicons/react/outline/UserIcon"
import CurrencyDollarIcon from "@heroicons/react/outline/CurrencyDollarIcon"
import { useGetCredits } from "@src/hooks/useGetCredits";
import { useGetPostsByAuthor } from "@src/services/lens/posts"
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner"

const StudioSidebar = () => {
  const { address, isConnected } = useAccount();
  const { data: authenticatedProfile } = useAuthenticatedLensProfile();
  const { data: stakingData, isLoading: isLoadingStaking } = useStakingData(address);
  const { data: postsPaginated, isLoading: isLoadingPosts } = useGetPostsByAuthor(authenticatedProfile?.address);
  const posts = useMemo(() => postsPaginated?.pages.flatMap(page => page.posts) || [], [isLoadingPosts]);

  const totalStaked = useMemo(() => {
    if (!stakingData?.summary?.totalStaked) return "0";
    return formatStakingAmount(stakingData.summary.totalStaked);
  }, [stakingData?.summary]);

  const { data: creditBalance, isLoading: isLoadingCredits } = useGetCredits(address as string, isConnected);

  const profileDisabled = !authenticatedProfile?.username?.localName;

  const menuItems = [
    // { icon: <PlusCircleIcon className="h-4 w-4" />, label: "Studio", href: "/studio/create", disabled: false },
    // { icon: <UserIcon className="h-4 w-4" />, label: "Profile", href: `/profile/${authenticatedProfile?.username?.localName}`, disabled: profileDisabled },
    { icon: <CurrencyDollarIcon className="h-4 w-4" />, label: "Stake Bonsai", href: "/studio/stake", disabled: false },
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
                ? "text-secondary/40 cursor-not-allowed"
                : "text-secondary/90 hover:text-brand-highlight hover:bg-card-light"
            )}
            onClick={e => {
              if (item.disabled) {
                e.preventDefault();
              }
            }}
          >
            <div className="p-1 rounded-lg bg-card-light border border-gray-700 shadow-sm">
              {item.icon}
            </div>
            <span className="text-sm flex items-center ml-4">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="my-4 h-[1px] bg-[rgba(255,255,255,0.05)]" />

      {/* Bonsai Token Info */}
      <div className="">
        <div className="space-y-6 px-2">
          <div>
            <Header2 className="text-lg font-medium opacity-80">Staked</Header2>
            <p className="text-sm text-secondary/90 mt-2">{kFormatter(totalStaked)} $BONSAI</p>
          </div>
          {/* <div>
            <Header2 className="text-lg font-medium opacity-80">Capacity Today</Header2>
            <p className="text-sm text-secondary/90 mt-2">~{Math.floor(Number(creditBalance?.creditsRemaining || 0) / 3)} post generations</p>
          </div> */}
        </div>
      </div>

      <div className="my-4 h-[1px] bg-[rgba(255,255,255,0.05)]" />

      {/* Recent Posts */}
      {/* <div className="">
        <Header2 className="text-lg font-medium opacity-80 px-2">Recent Posts</Header2>
        {isLoadingPosts && <div className="flex justify-center mt-4"><Spinner customClasses="h-6 w-6" color="#5be39d" /></div>}
        <nav className="mt-2 space-y-2">
          {posts?.map((post) => (
            <Link
              key={post.slug}
              href={`/post/${post.slug}?returnTo=/studio`}
              className="flex items-center px-2 py-2 text-sm text-secondary/90 hover:text-brand-highlight hover:bg-card-light rounded-lg transition-colors"
            >
              {post.metadata.content.substring(0, 25)}
              {post.metadata.content.length > 25 && '...'}
            </Link>
          ))}
        </nav>
      </div> */}

    </div>
  )
}

export default StudioSidebar;