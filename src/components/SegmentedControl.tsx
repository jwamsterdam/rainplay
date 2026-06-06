type SegmentedControlProps<T extends string> = {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  compact?: boolean;
  displayLabels?: Partial<Record<T, string>>;
};

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  compact = false,
  displayLabels,
}: SegmentedControlProps<T>) {
  return (
    <div className={compact ? "segmented segmented-compact" : "segmented"} role="group" aria-label={label}>
      {options.map((option) => {
        const displayLabel = displayLabels?.[option] ?? option;

        return (
          <button
            aria-label={option}
            aria-pressed={option === value}
            className={option === value ? "segment active" : "segment"}
            key={option}
            onClick={() => onChange(option)}
            title={option}
            type="button"
          >
            {displayLabel}
          </button>
        );
      })}
    </div>
  );
}
