import { IconPlus, IconHeart, IconFire } from "./icons";

const tabs = [
  { label: "Explora", icon: IconPlus, active: true },
  { label: "Feed", icon: IconHeart },
  { label: "Tabú", icon: IconFire },
];

export default function Tabs() {
  return (
    <div className="flex">
      {tabs.map(({ label, icon: Icon, active }) => (
        <button
          key={label}
          className={`flex flex-1 items-center justify-center gap-2 border-b-2 pb-3 text-sm font-medium transition ${
            active
              ? "border-purple text-purple"
              : "border-transparent text-white/40 hover:text-white/70"
          }`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
