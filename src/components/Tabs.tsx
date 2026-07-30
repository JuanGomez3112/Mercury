import { IconPlus, IconHeart, IconGrid } from "./icons";

const tabs = [
  { label: "Explora", icon: IconPlus, active: true },
  { label: "Feed", icon: IconHeart },
  { label: "Tabú", icon: IconGrid },
];

export default function Tabs() {
  return (
    <div className="rounded-2xl border border-white/10 bg-navy-2/40 px-2">
      <div className="flex">
        {tabs.map(({ label, icon: Icon, active }) => (
          <button
            key={label}
            className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-3 text-sm font-medium transition ${
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
    </div>
  );
}
