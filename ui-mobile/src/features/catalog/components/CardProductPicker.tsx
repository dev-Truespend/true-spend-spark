import { useMemo } from "react";
import { Dropdown } from "@/shared/components/Dropdown";
import { CardProduct, Issuer } from "@/features/catalog/types/catalog.types";

type Props = {
  products: CardProduct[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  // When provided, the product list is filtered to those belonging to this issuer
  // (matched by issuer.displayName === product.issuerName, since CardProduct only
  // carries issuerName, not issuerId).
  issuer?: Issuer | null;
};

export function CardProductPicker({ products, selectedId, onSelect, issuer }: Props) {
  const filtered = useMemo(() => {
    if (!issuer) return products;
    return products.filter((p) => p.issuerName === issuer.displayName);
  }, [products, issuer]);

  const placeholder = issuer ? `Select a ${issuer.displayName} card` : "Select a card";

  return (
    <Dropdown<number>
      placeholder={placeholder}
      value={selectedId}
      options={filtered.map((p) => ({ label: p.displayName, value: p.id }))}
      onChange={onSelect}
      sheetTitle="Choose card"
      searchable
      searchPlaceholder="Search cards…"
      disabled={!issuer}
      emptyLabel={
        issuer
          ? `No ${issuer.displayName} cards in the catalog yet`
          : "Select an issuer first"
      }
    />
  );
}
