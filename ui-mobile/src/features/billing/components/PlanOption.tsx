import { Button } from "@/shared/components/Button";

type Props = {
  code: string;
  displayName: string;
  trialDays: number;
  isSelected: boolean;
  onSelect: (code: string) => void;
};

export function PlanOption({ code, displayName, trialDays, isSelected, onSelect }: Props) {
  const trialSuffix = trialDays > 0 ? ` • ${trialDays}-day trial` : "";
  return (
    <Button
      label={`${displayName}${trialSuffix}`}
      onPress={() => onSelect(code)}
      variant={isSelected ? "primary" : "secondary"}
    />
  );
}
