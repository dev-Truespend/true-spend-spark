import { SegmentedControl } from "@/shared/components/SegmentedControl";

type Period = "monthly" | "annual";

type Props = {
  value: string;
  onChange: (period: Period) => void;
};

export function PeriodToggle({ value, onChange }: Props) {
  return (
    <SegmentedControl<Period>
      value={value === "annual" ? "annual" : "monthly"}
      onChange={onChange}
      options={[
        { value: "monthly", label: "Monthly" },
        { value: "annual", label: "Annual · save 25%" }
      ]}
    />
  );
}
