import { useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Badge } from "@/shared/components/Badge";
import { Button } from "@/shared/components/Button";
import { SectionLabel } from "@/shared/components/SectionLabel";
import { SegmentedControl } from "@/shared/components/SegmentedControl";
import { Toast } from "@/shared/components/Toast";
import { NotificationBell } from "@/shared/components/NotificationBell";
import { TrialBanner } from "@/features/billing/components/TrialBanner";
import { CardEmptyState } from "@/features/cards/components/CardEmptyState";
import { CardListItem } from "@/features/cards/components/CardListItem";
import { CardsSkeleton } from "@/features/cards/components/CardsSkeleton";
import { CategoryChips } from "@/features/cards/components/CategoryChips";
import { Greeting } from "@/features/cards/components/Greeting";
import { PortfolioSummary } from "@/features/cards/components/PortfolioSummary";
import { RecommendationCard } from "@/features/cards/components/RecommendationCard";
import { RunnerUpList } from "@/features/cards/components/RunnerUpList";
import { WalletGlobeBackground, type WalletGlobeHandle } from "@/features/cards/components/WalletGlobeBackground";
import { useCardsList } from "@/features/cards/hooks/useCardsList";
import { useHomeRecommendations } from "@/features/cards/hooks/useHomeRecommendations";
import { PlaidLinkCancelledError, useAddPlaidConnection } from "@/features/plaid/hooks/usePlaidConnections";
import { friendlyMessage } from "@/shared/errors/friendlyMessage";
import { useEntitlementGate } from "@/shared/navigation/useEntitlementGate";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";

type SourceFilter = "all" | "plaid" | "manual";

export function WalletScreen() {
  const router = useRouter();
  const styles = useThemedStyles(buildStyles);
  const { cards, limits, isLoading: cardsLoading, error: cardsError } = useCardsList();
  const addPlaidMutation = useAddPlaidConnection();
  const gate = useEntitlementGate();
  const { bootstrap } = useAuth();
  const home = useHomeRecommendations();
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const globeRef = useRef<WalletGlobeHandle>(null);
  // Three snap points (globe-only / mid / full). The low snap minimizes the
  // sheet to a sliver so the whole globe shows (Flighty-style); open at mid.
  const snapPoints = useMemo(() => ["12%", "58%", "92%"], []);

  const plaidEnabled = gate.has("plaid_linking_enabled");
  const atPlaidLimit = !limits?.unlimited && limits?.plaidLimit != null && limits.plaidUsed >= limits.plaidLimit;
  const atManualLimit = !limits?.unlimited && limits?.manualLimit != null && limits.manualUsed >= limits.manualLimit;
  const hasCards = cards.length > 0;
  const plaidCount = useMemo(() => cards.filter((c) => c.source === "plaid").length, [cards]);
  const manualCount = useMemo(() => cards.filter((c) => c.source === "manual").length, [cards]);
  const visibleCards = useMemo(() => {
    if (sourceFilter === "all") return cards;
    return cards.filter((c) => c.source === sourceFilter);
  }, [cards, sourceFilter]);

  const displayName = bootstrap?.profile.displayName ?? null;
  const firstName = displayName?.split(" ")[0] ?? null;
  const recommendation = home.response?.recommendation;
  const portfolio = home.response?.portfolio ?? [];
  const categoryDisplayName =
    home.categories.find((c) => c.code === recommendation?.categoryCode)?.displayName ?? undefined;

  function handleCardPress(cardId: number) {
    router.push(`/(app)/cards/${cardId}`);
  }

  function handleAddManual() {
    router.push("/(app)/cards/new");
  }

  async function handleConnectPlaid() {
    try {
      await addPlaidMutation.mutateAsync();
      router.push("/(app)/cards/plaid-connections");
    } catch (err) {
      if (err instanceof PlaidLinkCancelledError) return;
      Alert.alert("Couldn't link bank", friendlyMessage(err, "plaid"));
    }
  }

  function handleBrowseCatalog() {
    router.push("/(app)/cards/catalog");
  }

  function handleUpgrade() {
    router.push({ pathname: "/(app)/billing", params: { requiredPlanCode: "pro" } });
  }

  return (
    <View style={styles.fill}>
      <StatusBar style="light" />
      <WalletGlobeBackground ref={globeRef} />

      <SafeAreaView edges={["top"]} style={styles.headerSafe} pointerEvents="box-none">
        <View style={styles.headerRow} pointerEvents="box-none">
          <View style={styles.bannerWrap} pointerEvents="box-none">
            <TrialBanner onGlobe />
          </View>
          <NotificationBell onGlobe />
        </View>
        <View style={styles.controlsCol} pointerEvents="box-none">
          <Pressable
            onPress={() => globeRef.current?.recenter()}
            accessibilityRole="button"
            accessibilityLabel="Center the globe on my location"
            hitSlop={10}
            style={({ pressed }) => [styles.locate, pressed && styles.locatePressed]}
          >
            <Ionicons name="locate" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </SafeAreaView>

      <BottomSheet
        index={1}
        snapPoints={snapPoints}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.handle}
      >
        <BottomSheetScrollView
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
        >
          <Greeting name={firstName} />

          {cardsLoading && !hasCards ? <CardsSkeleton /> : null}
          {cardsError ? <Toast tone="error" message={cardsError} /> : null}
          {home.error ? <Toast tone="error" message={home.error} /> : null}

          {!cardsLoading && !cardsError && !hasCards ? (
            <CardEmptyState
              onAddManual={handleAddManual}
              onConnectPlaid={handleConnectPlaid}
              onBrowseCatalog={handleBrowseCatalog}
              onUpgrade={handleUpgrade}
              plaidEnabled={plaidEnabled}
            />
          ) : null}

          {hasCards && recommendation ? (
            <RecommendationCard
              recommendation={{ ...recommendation, categoryDisplayName }}
              onOpenCard={() => home.openCardDetails(recommendation.recommendedCard.card.id)}
              onRefresh={() => void home.refresh()}
            />
          ) : null}

          {hasCards && recommendation && recommendation.merchant && home.categories.length > 0 ? (
            <CategoryChips
              categories={home.categories}
              activeCode={recommendation.categoryCode}
              onChange={(code) => void home.changeCategory(code)}
              ambiguous={recommendation.merchant.isMultiCategory}
              merchantName={recommendation.merchant.name}
              categoryDisplayName={categoryDisplayName}
            />
          ) : null}

          {hasCards && recommendation && recommendation.runnerUpCards.length > 0 ? (
            <RunnerUpList
              runnerUps={recommendation.runnerUpCards.map((r) => ({
                ...r,
                card: { ...r.card, issuerName: r.card.issuerName, lastFour: r.card.lastFour },
                reason: r.reason
              }))}
              onSelect={(id) => home.openCardDetails(id)}
            />
          ) : null}

          {hasCards ? (
            <>
              <SectionLabel>Your cards</SectionLabel>
              <SegmentedControl
                value={sourceFilter}
                onChange={(next: SourceFilter) => setSourceFilter(next)}
                options={[
                  { label: `All · ${cards.length}`, value: "all" },
                  { label: `Plaid · ${plaidCount}`, value: "plaid" },
                  { label: `Manual · ${manualCount}`, value: "manual" }
                ]}
              />

              <View style={styles.stack}>
                {visibleCards.map((card, i) => (
                  <CardListItem key={card.id} card={card} onPress={handleCardPress} index={i} peek />
                ))}
              </View>

              {cards.some((c) => c.isPrimary || c.syncStatus === "disconnected") ? (
                <View style={styles.statusRow}>
                  {cards.filter((c) => c.isPrimary).map((c) => (
                    <Badge key={`primary-${c.id}`} tone="blue" label={`Primary · ${c.displayName}`} />
                  ))}
                  {cards.filter((c) => c.syncStatus === "disconnected").map((c) => (
                    <Badge key={`reconnect-${c.id}`} tone="amber" label={`Reconnect · ${c.displayName}`} />
                  ))}
                </View>
              ) : null}

              {(atPlaidLimit || atManualLimit) && !limits?.unlimited ? (
                <Toast tone="warn" message="You've reached your card limit on the Basic plan. Upgrade to add more." />
              ) : null}

              {!plaidEnabled ? (
                <Toast tone="info" message="Bank linking is a Pro feature. Upgrade to connect Plaid accounts." />
              ) : null}

              {portfolio.length > 0 && !recommendation ? (
                <PortfolioSummary cards={portfolio} onOpenCard={(id) => home.openCardDetails(id)} />
              ) : null}

              <View style={styles.actions}>
                <SectionLabel>Add another</SectionLabel>
                {!atManualLimit ? (
                  <Button label="＋ Add card manually" onPress={handleAddManual} variant="outline" />
                ) : null}
                {plaidEnabled && !atPlaidLimit ? (
                  <Button
                    label="Connect bank account"
                    onPress={handleConnectPlaid}
                    disabled={addPlaidMutation.isPending}
                    variant="outline"
                  />
                ) : null}
                {(atPlaidLimit || atManualLimit || !plaidEnabled) && !limits?.unlimited ? (
                  <Button label="Upgrade to Pro" onPress={handleUpgrade} />
                ) : null}
              </View>
            </>
          ) : null}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

function buildStyles(t: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    fill: { flex: 1, backgroundColor: "#000" },
    headerSafe: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 5 },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
      paddingHorizontal: t.spacing.md,
      paddingTop: t.spacing.xs
    },
    bannerWrap: { flex: 1 },
    controlsCol: { alignItems: "flex-end", paddingHorizontal: t.spacing.md, marginTop: t.spacing.sm },
    locate: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(18, 22, 30, 0.55)",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.22)"
    },
    locatePressed: { opacity: 0.7 },
    sheetBg: {
      backgroundColor: t.colors.background,
      borderTopLeftRadius: t.radii.xxl,
      borderTopRightRadius: t.radii.xxl
    },
    handle: { backgroundColor: t.colors.borderStrong, width: 40 },
    sheetContent: {
      paddingHorizontal: t.spacing.md,
      paddingTop: t.spacing.xs,
      paddingBottom: t.spacing.lg + 80,
      gap: t.spacing.md
    },
    stack: { paddingBottom: 8 },
    statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    actions: { gap: 8 }
  });
}
