import { SegmentedControl } from "@/shared/components/SegmentedControl";
import { AnalyticsPeriod } from "@/features/insights/types/analytics.types";

type Props = {
  selected: AnalyticsPeriod;
  onSelect: (period: AnalyticsPeriod) => void;
};

export function PeriodSelector({ selected, onSelect }: Props) {
  return (
    <SegmentedControl<AnalyticsPeriod>
      value={selected}
      onChange={onSelect}
      options={[
        { value: "week", label: "Week" },
        { value: "month", label: "Month" },
        { value: "quarter", label: "Quarter" },
        { value: "year", label: "Year" }
      ]}
    />
  );
}
