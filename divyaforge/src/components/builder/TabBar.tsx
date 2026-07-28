"use client";

import type { TabId } from "@/store/builderStore";
import { TAB_ORDER, useBuilderStore } from "@/store/builderStore";

const TAB_META: Record<TabId, { en: string; hi: string; icon: JSX.Element }> = {
  deity: {
    en: "Deity",
    hi: "देवता",
    icon: <path d="M12 3l7 5v2H5V8l7-5zM6 11h12v7H6zM4 18h16v2H4z" />,
  },
  face: {
    en: "Face",
    hi: "मुख",
    icon: (
      <path d="M12 4a8 8 0 100 16 8 8 0 000-16zM9 10h.01M15 10h.01M8.5 14.5s1.2 1.5 3.5 1.5 3.5-1.5 3.5-1.5" />
    ),
  },
  body: {
    en: "Body",
    hi: "शरीर",
    icon: (
      <path d="M12 4a2.5 2.5 0 110 5 2.5 2.5 0 010-5zM7 10h10M12 9v6m0 0l-3 5m3-5l3 5" />
    ),
  },
  vastra: {
    en: "Vastra",
    hi: "वस्त्र",
    icon: <path d="M8 4l4 2 4-2 4 4-3 3v9H7v-9L4 8l4-4z" />,
  },
  ayudha: {
    en: "Ayudha",
    hi: "आयुध",
    icon: (
      <path d="M8 20v-6L5 9c2-2 4-2 6 0v-3a1 1 0 112 0v3m0 0v-2a1 1 0 112 0v3m0 0v-1a1 1 0 112 0v5c0 3-2 6-5 6h-4z" />
    ),
  },
  pose: {
    en: "Pose",
    hi: "भंगिमा",
    icon: (
      <path d="M13 5a2 2 0 110 .01M7 10l4 1 3-2 3 2m-6 0v4l-3 5m4-5l2 5" />
    ),
  },
  base: {
    en: "Base",
    hi: "आसन",
    icon: <path d="M8 6h8l2 6H6l2-6zM4 14h16v3H4zm2 3h12v3H6z" />,
  },
  color: {
    en: "Color",
    hi: "रंग",
    icon: (
      <path d="M12 3s6 7 6 11a6 6 0 11-12 0c0-4 6-11 6-11z" />
    ),
  },
  share: {
    en: "Share",
    hi: "साझा",
    icon: (
      <path d="M17 5a2.5 2.5 0 110 5 2.5 2.5 0 010-5zM7 9.5a2.5 2.5 0 110 5 2.5 2.5 0 010-5zm10 4.5a2.5 2.5 0 110 5 2.5 2.5 0 010-5zM9 11l6-3.5M9 13l6 3.5" />
    ),
  },
  buy: {
    en: "Buy",
    hi: "क्रय",
    icon: (
      <path d="M6 8h12l-1 11H7L6 8zm3 0a3 3 0 116 0" />
    ),
  },
};

/**
 * The left-menu pipeline (PRD §6.1): vertical rail on desktop, horizontal
 * scroll strip on mobile.
 */
export function TabBar() {
  const activeTab = useBuilderStore((s) => s.activeTab);
  const setActiveTab = useBuilderStore((s) => s.setActiveTab);

  return (
    <nav
      aria-label="Builder pipeline"
      className="flex shrink-0 flex-row gap-1 overflow-x-auto border-b border-stone-200 bg-white px-2 py-1.5 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:px-1.5 md:py-2"
    >
      {TAB_ORDER.map((id) => {
        const meta = TAB_META[id];
        const active = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            aria-current={active ? "page" : undefined}
            className={[
              "flex min-w-[64px] flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] font-medium transition md:min-w-0 md:w-16",
              active
                ? "bg-saffron-100 text-saffron-700"
                : "text-stone-500 hover:bg-stone-100 hover:text-stone-700",
            ].join(" ")}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {meta.icon}
            </svg>
            <span>{meta.en}</span>
          </button>
        );
      })}
    </nav>
  );
}
