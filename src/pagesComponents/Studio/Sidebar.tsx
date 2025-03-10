"use client"

import { Header } from "@src/styles/text"
import { Button } from "@src/components/Button"
import Link from "next/link"
import clsx from "clsx"
import { useAuthenticatedLensProfile } from "@src/hooks/useLensProfile"

const StudioSidebar = () => {
  const { data: authenticatedProfile } = useAuthenticatedLensProfile();

  const profileDisabled = !authenticatedProfile?.username?.localName;

  const menuItems = [
    { icon: null, label: "Create", href: "/studio/create", disabled: false },
    { icon: null, label: "Profile", href: "/studio", disabled: profileDisabled },
    { icon: null, label: "Bonsai Token", href: "/studio/token", disabled: false },
  ]

  return (
    <div className="flex flex-col h-full w-64 bg-card rounded-xl p-4">
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

      {/* Recent Posts */}
      <div className="mt-12">
        <Header className="text-lg text-primary">Recent Posts</Header>
        <nav className="mt-2 space-y-1">
          <Link
            href="/studio/post/1"
            className="block px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-card-light rounded-lg transition-colors"
          >
            Post Title 1 [disable updates]
          </Link>
          <Link
            href="/studio/post/2"
            className="block px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-card-light rounded-lg transition-colors"
          >
            Post Title 2
          </Link>
        </nav>
      </div>

      {/* Bonsai Token Info */}
      <div className="mt-12">
        <Header className="text-lg text-primary">$BONSAI</Header>
        <div className="mt-4 space-y-4 px-3">
          <div>
            <p className="text-sm text-primary">Staking</p>
            <p className="text-secondary mt-1">50k</p>
          </div>
          <div>
            <p className="text-sm text-primary">AI Credits (today)</p>
            <p className="text-secondary mt-1">100</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StudioSidebar;