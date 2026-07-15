import { useEffect, useRef } from "react";

type SegmentedControlProps<T extends string> = {
  readonly label: string;
  readonly options: readonly T[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly compact?: boolean;
  readonly disabled?: boolean;
  readonly displayLabels?: Partial<Record<T, string>>;
  readonly scrollFractionRef?: React.RefObject<number>;
};

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  compact = false,
  disabled = false,
  displayLabels,
  scrollFractionRef,
}: SegmentedControlProps<T>) {
  const indicatorRef = useRef<HTMLDivElement>(null);

  const className = [
    "segmented",
    compact ? "segmented-compact" : "",
    disabled ? "segmented-disabled" : "",
    scrollFractionRef ? "segmented--with-indicator" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // RAF loop: read fraction from ref and drive the indicator's transform.
  // No React state involved — zero re-renders.
  useEffect(() => {
    if (!scrollFractionRef) return;
    const fractionRef = scrollFractionRef; // narrowed: guaranteed non-undefined in closure
    let running = true;
    let lastFraction = -1;
    const N = options.length;

    function tick() {
      if (!running) return;
      const fraction = fractionRef.current ?? 0;
      if (fraction !== lastFraction && indicatorRef.current) {
        lastFraction = fraction;
        // translateX moves the indicator by multiples of one segment-width (100%/N each).
        indicatorRef.current.style.transform = `translateX(${fraction * (N - 1) * 100}%)`;
      }
      requestAnimationFrame(tick);
    }

    const rafId = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(rafId);
    };
  }, [scrollFractionRef, options.length]);

  return (
    <div aria-disabled={disabled} aria-label={label} className={className} role="radiogroup">
      {scrollFractionRef && (
        <div className="segment-indicator" aria-hidden="true" ref={indicatorRef} />
      )}
      {options.map((option) => {
        const displayLabel = displayLabels?.[option] ?? option;

        return (
          <button
            aria-label={option}
            aria-checked={option === value}
            className={option === value ? "segment active" : "segment"}
            disabled={disabled}
            key={option}
            onClick={() => {
              if (!disabled) onChange(option);
            }}
            role="radio"
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
