import Icon from "@shared/ui/Icon";

type IconName = Parameters<typeof Icon>[0]["name"];

interface Props {
  icon: IconName;
  label: string;
  value: number;
  accent?: string;
}

export default function StatTile({ icon, label, value, accent }: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--w-line-normal)] bg-[var(--w-bg-elevated)] px-5 py-[18px] dark:shadow-[var(--w-shadow-card)]">
      <div className="flex items-center gap-2">
        <span
          className="grid place-items-center w-7 h-7 rounded-lg shrink-0"
          style={{
            background: accent ? `color-mix(in srgb, ${accent} 14%, transparent)` : "var(--w-bg-alternative)",
            color: accent ?? "var(--w-fg-neutral)",
          }}
        >
          <Icon name={icon} size={15} />
        </span>
        <span className="font-semibold text-[13px] leading-[1.3] text-[var(--w-fg-neutral)]">{label}</span>
      </div>
      <div className="font-extrabold text-[28px] leading-none tracking-[-0.02em] text-[var(--w-fg-strong)] tabular-nums">
        {value}
      </div>
    </div>
  );
}
