export default function StepBadge({ n }: { n: number }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-700 text-[11px] font-semibold text-white">
      {n}
    </span>
  );
}
