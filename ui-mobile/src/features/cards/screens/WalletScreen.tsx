import { useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Toast } from "@/shared/components/Toast";
import { NotificationBell } from "@/shared/components/NotificationBell";
import { TrialBanner } from "@/features/billing/components/TrialBanner";
import { CardEmptyState } from "@/features/cards/components/CardEmptyState";
import { CategoryChips } from "@/features/cards/components/CategoryChips";
import { Greeting } from "@/features/cards/components/Greeting";
import { RecentVisits } from "@/features/cards/components/RecentVisits";
import { PlaceSearchBar } from "@/features/cards/components/PlaceSearchBar";
import { RecommendationCard } from "@/features/cards/components/RecommendationCard";
import { RunnerUpList } from "@/features/cards/components/RunnerUpList";
import { WalletGlobeBackground, type WalletGlobeHandle } from "@/features/cards/components/WalletGlobeBackground";
import { useCardsList } from "@/features/cards/hooks/useCardsList";
import { useHomeRecommendations } from "@/features/cards/hooks/useHomeRecommendations";
import { useNearbyMerchants } from "@/features/cards/hooks/useNearbyMerchants";
import { useRecentVisits } from "@/features/cards/hooks/useRecentVisits";
import { useEntitlementGate } from "@/shared/navigation/useEntitlementGate";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import type { NearbyMerchant } from "@/features/cards/types/home.types";

export function WalletScreen() {
  const router = useRouter();
  const styles = useThemedStyles(buildStyles);
  const { cards, isLoading: cardsLoading } = useCardsList();
  const gate = useEntitlementGate();
  const { bootstrap } = useAuth();
  const home = useHomeRecommendations();
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  // Tier gating: pins are Basic+, search is Pro. Free sees the map + auto-detected recommendation only.
  const showPins = gate.has("map_pins_enabled");
  const showSearch = gate.has("place_search_enabled");
  // Skip the nearby fetch entirely when pins are gated off — no point querying merchants we won't draw.
  const { merchants } = useNearbyMerchants(showPins ? center : null);
  const { visits } = useRecentVisits();
  const globeRef = useRef<WalletGlobeHandle>(null);
  const sheetRef = useRef<BottomSheet>(null);
  // Globe-only / mid / full. The low snap minimizes the sheet so the whole map shows; open at mid.
  const snapPoints = useMemo(() => ["12%", "58%", "92%"], []);

  const plaidEnabled = gate.has("plaid_linking_enabled");
  const hasCards = cards.length > 0;
  const displayName = bootstrap?.profile.displayName ?? null;
  const firstName = displayName?.split(" ")[0] ?? null;
  const recommendation = home.response?.recommendation;
  const categoryDisplayName =
    home.categories.find((c) => c.code === recommendation?.categoryCode)?.displayName ?? undefined;

  function handleSelectSearchResult(merchant: NearbyMerchant) {
    void home.selectPlace(merchant);
    globeRef.current?.focusOn(merchant.lat, merchant.lng);
    sheetRef.current?.snapToIndex(1);
  }

  function handleAddManual() {
    router.push("/(app)/cards/new");
  }

  function handleOpenCardsTab() {
    router.push("/(app)/(tabs)/cards");
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
      <WalletGlobeBackground
        ref={globeRef}
        merchants={merchants}
        showPins={showPins}
        onUserLocated={setCenter}
        onSelectMerchant={(merchant) => {
          void home.selectPlace(merchant);
          sheetRef.current?.snapToIndex(1);
        }}
      />

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
            accessibilityLabel="Center the map on my location"
            hitSlop={10}
            style={({ pressed }) => [styles.locate, pressed && styles.locatePressed]}
          >
            <Ionicons name="locate" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </SafeAreaView>

      <BottomSheet
        ref={sheetRef}
        index={1}
        snapPoints={snapPoints}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.handle}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
          <Greeting name={firstName} />

          {hasCards && showSearch ? <PlaceSearchBar center={center} onSelect={handleSelectSearchResult} /> : null}

          {home.error ? <Toast tone="error" message={home.error} /> : null}

          {!cardsLoading && !hasCards ? (
            <CardEmptyState
              onAddManual={handleAddManual}
              onConnectPlaid={handleOpenCardsTab}
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

          {/* Category selector only for multi-category merchants (Walmart/Target), not single-category (Chipotle). */}
          {hasCards && recommendation && recommendation.merchant.isMultiCategory && home.categories.length > 0 ? (
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
            <RecentVisits
              visits={visits}
              onSelect={(visit) => {
                void home.selectVisit(visit.merchant.id, visit.categoryCode);
                sheetRef.current?.snapToIndex(1);
              }}
            />
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
    }
  });
}
