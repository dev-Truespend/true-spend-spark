import { Dropdown } from "@/shared/components/Dropdown";
import { Issuer } from "@/features/catalog/types/catalog.types";

type Props = {
  issuers: Issuer[];
  selectedId: number | null;
  onSelect: (id: number) => void;
};

export function IssuerPicker({ issuers, selectedId, onSelect }: Props) {
  return (
    <Dropdown<number>
      placeholder="Select issuer"
      value={selectedId}
      options={issuers.map((i) => ({ label: i.displayName, value: i.id }))}
      onChange={onSelect}
      sheetTitle="Choose issuer"
      searchable
      searchPlaceholder="Search issuers…"
    />
  );
}
