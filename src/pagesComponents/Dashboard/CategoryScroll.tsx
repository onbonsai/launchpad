"use client"

import { useRef, useEffect, useState } from "react"
import clsx from "clsx";
import { brandFont } from "@src/fonts/fonts";

export type Category = {
  key: string | undefined;
  label: string;
}

interface CategoryScrollProps {
  categories: Category[];
  categoryFilter: string | undefined;
  setCategoryFilter: (category: string | undefined) => void;
}

export function CategoryScroll({ categories, categoryFilter, setCategoryFilter }: CategoryScrollProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showGradient, setShowGradient] = useState(false)

  // Check if scrolling is needed and update gradient visibility
  const checkScroll = () => {
    if (!scrollContainerRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
    setShowGradient(scrollLeft < scrollWidth - clientWidth - 10) // 10px buffer
  }

  // Initialize scroll check
  useEffect(() => {
    checkScroll()
    window.addEventListener("resize", checkScroll)
    return () => window.removeEventListener("resize", checkScroll)
  }, []);

  if (!categories?.length) return null;

  return (
    <>
      <div
        ref={scrollContainerRef}
        className="bg-card-light rounded-full flex overflow-x-auto scrollbar-hide relative"
        onScroll={checkScroll}
      >
        {categories.map((c) => (
          <button
            key={c.label}
            className={clsx(
              c.key === categoryFilter
                ? 'bg-brand-highlight text-white relative group hover:bg-brand-highlight/90'
                : 'text-secondary/60 hover:bg-card transition-colors',
              `py-1.5 sm:py-2 rounded-full flex-shrink-0 whitespace-nowrap mr-2 ${brandFont.className}`,
              c.key === categoryFilter ? 'pl-4 sm:pl-6 pr-8 sm:pr-10' : 'px-4 sm:px-6'
            )}
            onClick={() => setCategoryFilter(c.key === categoryFilter ? undefined : c.key)}
          >
            <span className="text-sm sm:text-md">{c.label}</span>
            {c.key === categoryFilter && (
              <span className="absolute right-4 opacity-40 group-hover:opacity-100 transition-opacity">
                ×
              </span>
            )}
          </button>
        ))}
      </div>

      {showGradient && (
        <div className="absolute right-0 top-2 bottom-0 flex items-center bg-gradient-to-l from-card via-card to-transparent pl-10 pr-2 rounded-r-full" />
      )}
    </>
  )
}
