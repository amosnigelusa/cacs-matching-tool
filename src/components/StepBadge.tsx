export default function StepBadge({ n }: { n: number }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-700 text-[11px] font-semibold text-white dark:bg-teal-600">
      {n}
    </span>
  );
}
