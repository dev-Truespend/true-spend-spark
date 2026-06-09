import { View } from "react-native";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { ProUpsell } from "@/shared/components/ProUpsell";
import { useEntitlementGate } from "@/shared/navigation/useEntitlementGate";

type Props = {
  title: string;
  body: string;
  upgradeMessage?: string | null;
  onAddCard: () => void;
  onConnectBank: () => void;
  onUpgrade?: () => void;
};

// Only path that surfaces an empty state now is "user has 0 cards" — the home
// portfolio block carries the screen for everyone else. See
// RecommendationsReadBusiness.GetHomeAsync.
export function HomeEmptyState({
  title,
  body,
  upgradeMessage,
  onAddCard,
  onConnectBank,
  onUpgrade
}: Props) {
  const gate = useEntitlementGate();
  const showUpgradeCta = !gate.isPro && !!onUpgrade;
  const upgradeCopy =
    upgradeMessage ??
    (gate.isPro
      ? null
      : gate.unlimitedCards
        ? null
        : `Pro unlocks unlimited cards beyond your ${gate.manualCardLimit ?? 1}-card limit.`);

  return (
    <View style={{ gap: 14 }}>
      <EmptyState
        iconLabel="💳"
        title={title}
        description={body}
        action={
          <View style={{ gap: 8 }}>
            <Button label="＋ Add a card manually" onPress={onAddCard} />
            <Button label="Connect a bank with Plaid" onPress={onConnectBank} variant="outline" />
          </View>
        }
      />

      {showUpgradeCta ? (
        <ProUpsell
          title="Upgrade to Pro"
          body={upgradeCopy ?? "Unlock the full TrueSpend experience."}
          ctaLabel="Get Pro"
          onPress={onUpgrade!}
        />
      ) : null}
    </View>
  );
}
