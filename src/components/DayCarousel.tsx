import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useAtom } from "jotai";
import { DayChartRecharts } from "./DayChartRecharts";
import type { CellColors } from "./cellColors";
import { visibleHoursForSelection, visiblePointsForTodayHorizon } from "../lib/weatherView";
import { dayOptions, selectedDayAtom } from "../state/weatherAtoms";
import type { ForecastPoint, HorizonOption, HourlyWeather } from "../types";

export type DayCarouselProps = {
  hourly: HourlyWeather[];
  minutely15: ForecastPoint[];
  horizon: HorizonOption;
  cellColors: CellColors;
  showTemp: boolean;
  showRain: boolean;
  showIcons: boolean;
  isLoading: boolean;
  isError: boolean;
  onScrollFractionChange?: (fraction: number) => void;
  onRetry?: () => void;
};

export function DayCarousel({
  hourly,
  minutely15,
  horizon,
  cellColors,
  showTemp,
  showRain,
  showIcons,
  isLoading,
  isError,
  onScrollFractionChange,
  onRetry,
}: DayCarouselProps) {
  const [selectedDay, setSelectedDay] = useAtom(selectedDayAtom);
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingProgrammatically = useRef(false);

  // Always-current selected day, read inside the scroll listener without
  // re-subscribing it on every day change (which a closure over `selectedDay`
  // would force). Lets us skip the atom write when a swipe settles on the
  // already-selected day.
  const selectedDayRef = useRef(selectedDay);
  // eslint-disable-next-line react-hooks/refs
  selectedDayRef.current = selectedDay;

  const hoursVandaag = useMemo(
    () => visiblePointsForTodayHorizon(hourly, minutely15, horizon),
    [hourly, minutely15, horizon],
  );
  const hoursMorgen = useMemo(
    () => visibleHoursForSelection(hourly, "Morgen", horizon),
    [hourly, horizon],
  );
  const hoursOvermorgen = useMemo(
    () => visibleHoursForSelection(hourly, "Overmorgen", horizon),
    [hourly, horizon],
  );
  const hoursWeek = useMemo(
    () => visibleHoursForSelection(hourly, "Week", horizon),
    [hourly, horizon],
  );

  const panelHours = [hoursVandaag, hoursMorgen, hoursOvermorgen, hoursWeek];

  const selectedIndex = dayOptions.indexOf(selectedDay);

  // Atom → scroll: initial position (no animation)
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    isScrollingProgrammatically.current = true;
    el.scrollLeft = selectedIndex * el.offsetWidth;
    setTimeout(() => {
      isScrollingProgrammatically.current = false;
    }, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once at mount only

  // Atom → scroll: smooth scroll when atom changes after mount
  const isMounted = useRef(false);
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    isScrollingProgrammatically.current = true;
    el.scrollTo({ left: selectedIndex * el.offsetWidth, behavior: "smooth" });
    setTimeout(() => {
      isScrollingProgrammatically.current = false;
    }, 0);
  }, [selectedIndex]);

  // Scroll → atom: listen on scrollend (with debounced scroll fallback)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function updateAtomFromScroll() {
      if (isScrollingProgrammatically.current) return;
      if (!el) return;
      const containerWidth = el.offsetWidth;
      if (containerWidth === 0) return;
      const index = Math.round(el.scrollLeft / containerWidth);
      const clamped = Math.max(0, Math.min(dayOptions.length - 1, index));
      const day = dayOptions[clamped];
      // Skip redundant writes when the swipe settles on the already-selected
      // day — avoids re-rendering WeatherScreen (and reconciling all panels)
      // for a no-op change.
      if (day === selectedDayRef.current) return;
      setSelectedDay(day);
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    function onScroll() {
      // Fire fraction callback first — ungated, runs every frame.
      if (!el) return;
      const containerWidth = el.offsetWidth;
      const fraction =
        containerWidth > 0
          ? Math.max(
              0,
              Math.min(
                1,
                el.scrollLeft / (containerWidth * (dayOptions.length - 1)),
              ),
            )
          : 0;
      onScrollFractionChange?.(fraction);

      if (debounceTimer !== null) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(updateAtomFromScroll, 120);
    }

    const supportsScrollEnd = "onscrollend" in window;
    if (supportsScrollEnd) {
      el.addEventListener("scrollend", updateAtomFromScroll);
      el.addEventListener("scroll", onScroll);
    } else {
      el.addEventListener("scroll", onScroll);
    }

    return () => {
      if (supportsScrollEnd) {
        el.removeEventListener("scrollend", updateAtomFromScroll);
        el.removeEventListener("scroll", onScroll);
      } else {
        el.removeEventListener("scroll", onScroll);
      }
      // Clear debounce in both branches — onScroll sets it regardless of scrollend support.
      if (debounceTimer !== null) clearTimeout(debounceTimer);
    };
  }, [setSelectedDay, onScrollFractionChange]);

  // Resize: jump to correct panel without animation
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      isScrollingProgrammatically.current = true;
      el.scrollLeft = selectedIndex * el.offsetWidth;
      setTimeout(() => {
        isScrollingProgrammatically.current = false;
      }, 0);
    });
    observer.observe(el);
    return () => observer.disconnect();
  // selectedIndex intentionally excluded: only fire on resize, not on day change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="chart-carousel" ref={containerRef}>
      {dayOptions.map((day, i) => (
        <div key={day} className="chart-carousel-panel">
          {isLoading || isError ? (
            <div className="loading-panel">
              {isError ? (
                <>
                  <span>Weerdata niet beschikbaar</span>
                  {onRetry ? (
                    <button type="button" className="loading-retry" onClick={onRetry}>
                      Opnieuw proberen
                    </button>
                  ) : null}
                </>
              ) : (
                "Weer laden"
              )}
            </div>
          ) : (
            <DayChartRecharts
              hours={panelHours[i]}
              horizon={horizon}
              cellColors={cellColors}
              showTemp={showTemp}
              showRain={showRain}
              showIcons={showIcons}
              isToday={i === 0}
            />
          )}
        </div>
      ))}
    </div>
  );
}
