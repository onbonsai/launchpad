"use client"

import { useRef, useEffect, useState } from "react"
import clsx from "clsx";

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
    <div className="relative p-2">
      <div
        ref={scrollContainerRef}
        className="bg-card-light rounded-full p-1 flex overflow-x-auto scrollbar-hide relative pr-24"
        onScroll={checkScroll}
      >
        {categories.map((c) => (
          <button
            key={c.label}
            className={clsx(
              c.key === categoryFilter
                ? 'bg-primary text-white relative group hover:bg-primary/90'
                : 'text-secondary/60 hover:bg-card transition-colors',
              'py-2 rounded-full flex-shrink-0 whitespace-nowrap mr-2',
              c.key === categoryFilter ? 'pl-6 pr-10' : 'px-6'
            )}
            onClick={() => setCategoryFilter(c.key === categoryFilter ? undefined : c.key)}
          >
            <span>{c.label}</span>
            {c.key === categoryFilter && (
              <span className="absolute right-4 opacity-40 group-hover:opacity-100 transition-opacity">
                ×
              </span>
            )}
          </button>
        ))}
      </div>

      {showGradient && (
        <div className="absolute right-0 top-0 bottom-0 flex items-center bg-gradient-to-l from-card via-card to-transparent pl-10 pr-2 rounded-r-full" />
      )}
    </div>
  )
}
