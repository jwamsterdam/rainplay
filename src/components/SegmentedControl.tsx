type SegmentedControlProps<T extends string> = {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  compact?: boolean;
  disabled?: boolean;
  displayLabels?: Partial<Record<T, string>>;
};

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  compact = false,
  disabled = false,
  displayLabels,
}: SegmentedControlProps<T>) {
  const className = [
    "segmented",
    compact ? "segmented-compact" : "",
    disabled ? "segmented-disabled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div aria-disabled={disabled} aria-label={label} className={className} role="group">
      {options.map((option) => {
        const displayLabel = displayLabels?.[option] ?? option;

        return (
          <button
            aria-label={option}
            aria-pressed={option === value}
            className={option === value ? "segment active" : "segment"}
            disabled={disabled}
            key={option}
            onClick={() => {
              if (!disabled) onChange(option);
            }}
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
