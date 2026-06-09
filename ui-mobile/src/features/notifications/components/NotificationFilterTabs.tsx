import { SegmentedControl } from "@/shared/components/SegmentedControl";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "rewards", label: "Rewards" },
  { value: "security", label: "Security" }
] as const;

type Filter = typeof FILTERS[number]["value"];

type Props = {
  activeFilter: Filter;
  onFilterChange: (filter: Filter) => void;
};

export function NotificationFilterTabs({ activeFilter, onFilterChange }: Props) {
  return (
    <SegmentedControl<Filter>
      value={activeFilter}
      onChange={onFilterChange}
      options={FILTERS.map((f) => ({ value: f.value, label: f.label }))}
    />
  );
}
