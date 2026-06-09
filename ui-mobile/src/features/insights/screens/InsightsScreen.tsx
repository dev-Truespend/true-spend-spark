import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { EmptyState } from "@/shared/components/EmptyState";
import { FeatureGate } from "@/shared/components/FeatureGate";
import { ProLockBadge } from "@/shared/components/ProLockBadge";
import { ReasonCard } from "@/shared/components/ReasonCard";
import { Screen } from "@/shared/components/Screen";
import { SectionLabel } from "@/shared/components/SectionLabel";
import { SegmentedControl } from "@/shared/components/SegmentedControl";
import { Toast } from "@/shared/components/Toast";
import { colors } from "@/shared/theme/colors";
import { fontFamily, scaleFont } from "@/shared/theme/typography";
import { TransactionsContent } from "@/features/transactions/screens/TransactionsScreen";
import { AIInsightCard } from "@/features/insights/components/AIInsightCard";
import { CategoryBreakdownList } from "@/features/insights/components/CategoryBreakdownList";
import { CategoryDonutChart } from "@/features/insights/components/CategoryDonutChart";
import { DailyBreakdownChart } from "@/features/insights/components/DailyBreakdownChart";
import { MissedRewardCard } from "@/features/insights/components/MissedRewardCard";
import { PeriodSelector } from "@/features/insights/components/PeriodSelector";
import { RewardSummaryCard } from "@/features/insights/components/RewardSummaryCard";
import { useAIInsights } from "@/features/insights/hooks/useAIInsights";
import { useDismissAIInsight } from "@/features/insights/hooks/useDismissAIInsight";
import { useRewardsSummary } from "@/features/insights/hooks/useRewardsSummary";
import { AnalyticsPeriod, MissedReward } from "@/features/insights/types/analytics.types";
import { useEntitlementGate } from "@/shared/navigation/useEntitlementGate";

type Tab = "transactions" | "insights";

export function InsightsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("transactions");
  const gate = useEntitlementGate();

  return (
    <Screen padded={false}>
      <View style={styles.page}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Insights</Text>
          {!gate.isPro ? <ProLockBadge /> : null}
        </View>

        <SegmentedControl<Tab>
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: "transactions", label: "Transactions" },
            { value: "insights", label: "Insights" }
          ]}
        />

        {activeTab === "transactions" ? (
          <View style={{ flex: 1 }}>
            <TransactionsContent embedded />
          </View>
        ) : (
          <InsightsContent />
        )}
      </View>
    </Screen>
  );
}

function InsightsContent() {
  const router = useRouter();
  const [period, setPeriod] = useState<AnalyticsPeriod>("month");

  const gate = useEntitlementGate();
  const aiInsightsEnabled = gate.has("ai_insights_enabled");

  const { summary, isLoading: summaryLoading, error: summaryError } = useRewardsSummary(period);
  const { insights, isLoading: insightsLoading } = useAIInsights({ enabled: aiInsightsEnabled });
  const { dismiss } = useDismissAIInsight();

  function handleMissedRewardPress(item: MissedReward) {
    if (item.transactionId > 0) router.push(`/(app)/transactions/${item.transactionId}`);
  }

  return (
    <View style={{ flex: 1, gap: 12 }}>
      <PeriodSelector selected={period} onSelect={setPeriod} />

      {summaryLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : summaryError ? (
        <Toast tone="error" message={summaryError} />
      ) : summary ? (
        <>
          <RewardSummaryCard summary={summary} />
          {summary.dailyBreakdown.length > 0 ? <DailyBreakdownChart items={summary.dailyBreakdown} /> : null}
          {summary.categoryBreakdown.length > 0 ? (
            <>
              <CategoryDonutChart items={summary.categoryBreakdown} />
              <CategoryBreakdownList items={summary.categoryBreakdown} />
            </>
          ) : null}
          {summary.topMissedRewards.length > 0 ? (
            <View style={{ gap: 8 }}>
              <SectionLabel>Top missed-reward events</SectionLabel>
              {summary.topMissedRewards.map((item) => (
                <MissedRewardCard key={item.id} item={item} onPress={handleMissedRewardPress} />
              ))}
            </View>
          ) : null}
        </>
      ) : (
        <EmptyState
          iconLabel="📊"
          title="No data for this period yet"
          description="Add transactions to start tracking your rewards."
        />
      )}

      <FeatureGate feature="ai_insights_enabled">
        <View style={{ gap: 8 }}>
          <SectionLabel>AI insight</SectionLabel>
          {insightsLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : insights.length > 0 ? (
            insights.map((insight) => (
              <AIInsightCard key={insight.id} insight={insight} onDismiss={dismiss} />
            ))
          ) : (
            <ReasonCard
              title="AI insight"
              body="Personalized reward-optimization tips appear here automatically, refreshed daily from your latest spending."
            />
          )}
        </View>
      </FeatureGate>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 14, gap: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: colors.text, fontFamily: fontFamily.heavy, fontSize: scaleFont(24), fontWeight: "800", letterSpacing: -0.4 }
});
