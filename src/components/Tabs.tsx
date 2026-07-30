import Link from "next/link";
import { IconPlus, IconHeart, IconFire } from "./icons";
import type { FeedTab } from "@/lib/queries";

const tabs: { key: FeedTab; label: string; icon: typeof IconPlus }[] = [
  { key: "explora", label: "Explora", icon: IconPlus },
  { key: "feed", label: "Feed", icon: IconHeart },
  { key: "tabu", label: "Tabú", icon: IconFire },
];

export default function Tabs({ active }: { active: FeedTab }) {
  return (
    <div className="flex">
      {tabs.map(({ key, label, icon: Icon }) => {
        const on = key === active;
        return (
          <Link
            key={key}
            href={`/feed?tab=${key}`}
            className={`flex flex-1 items-center justify-center gap-2 border-b-2 pb-3 text-sm font-medium transition ${
              on ? "border-purple text-purple" : "border-transparent text-white/40 hover:text-white/70"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
