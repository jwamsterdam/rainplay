type SegmentedControlProps<T extends string> = {
  label: string;
  options: T[];
  value: T;
  onChange: (value: T) => void;
  compact?: boolean;
};

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  compact = false,
}: SegmentedControlProps<T>) {
  return (
    <div className={compact ? "segmented segmented-compact" : "segmented"} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          className={option === value ? "segment active" : "segment"}
          key={option}
          onClick={() => onChange(option)}
          type="button"
        >
          {option}
        </button>
      ))}
    </div>
  );
}
