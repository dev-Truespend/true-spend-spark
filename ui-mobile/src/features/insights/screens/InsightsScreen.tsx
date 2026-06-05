import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/shared/components/Screen";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";
import { TransactionsContent } from "@/features/transactions/screens/TransactionsScreen";
import { AIInsightCard } from "@/features/insights/components/AIInsightCard";
import { CategoryBreakdownList } from "@/features/insights/components/CategoryBreakdownList";
import { DailyBreakdownChart } from "@/features/insights/components/DailyBreakdownChart";
import { MissedRewardCard } from "@/features/insights/components/MissedRewardCard";
import { PeriodSelector } from "@/features/insights/components/PeriodSelector";
import { RewardSummaryCard } from "@/features/insights/components/RewardSummaryCard";
import { useAIInsights } from "@/features/insights/hooks/useAIInsights";
import { useDismissAIInsight } from "@/features/insights/hooks/useDismissAIInsight";
import { useGenerateAIInsights } from "@/features/insights/hooks/useGenerateAIInsights";
import { useRewardsSummary } from "@/features/insights/hooks/useRewardsSummary";
import { AnalyticsPeriod, MissedReward } from "@/features/insights/types/analytics.types";
import { useEntitlementGate } from "@/shared/navigation/useEntitlementGate";

type Tab = "transactions" | "insights";

export function InsightsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("transactions");

  return (
    <Screen>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "transactions" && styles.tabActive]}
          onPress={() => setActiveTab("transactions")}
        >
          <Text style={[styles.tabLabel, activeTab === "transactions" && styles.tabLabelActive]}>
            Transactions
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "insights" && styles.tabActive]}
          onPress={() => setActiveTab("insights")}
        >
          <Text style={[styles.tabLabel, activeTab === "insights" && styles.tabLabelActive]}>
            Insights
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "transactions" ? (
        <TransactionsContent embedded />
      ) : (
        <InsightsContent />
      )}
    </Screen>
  );
}

function InsightsContent() {
  const router = useRouter();
  const [insightsTab, setInsightsTab] = useState<"analytics" | "ai">("analytics");
  const [period, setPeriod] = useState<AnalyticsPeriod>("month");

  const gate = useEntitlementGate();
  const aiInsightsEnabled = gate.has("ai_insights_enabled");

  const { summary, isLoading: summaryLoading, error: summaryError } = useRewardsSummary(period);
  const { insights, isLoading: insightsLoading } = useAIInsights({ enabled: aiInsightsEnabled });
  const { generate, isLoading: generating } = useGenerateAIInsights();
  const { dismiss } = useDismissAIInsight();

  function handleMissedRewardPress(item: MissedReward) {
    if (item.transactionId > 0) {
      router.push(`/(app)/transactions/${item.transactionId}`);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.subTabRow}>
        <TouchableOpacity
          style={[styles.subTab, insightsTab === "analytics" && styles.subTabActive]}
          onPress={() => setInsightsTab("analytics")}
        >
          <Text style={[styles.subTabLabel, insightsTab === "analytics" && styles.subTabLabelActive]}>
            Analytics
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, insightsTab === "ai" && styles.subTabActive]}
          onPress={() => setInsightsTab("ai")}
        >
          <Text style={[styles.subTabLabel, insightsTab === "ai" && styles.subTabLabelActive]}>
            AI Insights
          </Text>
        </TouchableOpacity>
      </View>

      {insightsTab === "analytics" ? (
        <View style={styles.section}>
          <PeriodSelector selected={period} onSelect={setPeriod} />

          {summaryLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : summaryError ? (
            <Text style={styles.error}>{summaryError}</Text>
          ) : summary ? (
            <>
              <RewardSummaryCard summary={summary} />

              {summary.dailyBreakdown.length > 0 ? (
                <DailyBreakdownChart items={summary.dailyBreakdown} />
              ) : null}

              {summary.categoryBreakdown.length > 0 ? (
                <CategoryBreakdownList items={summary.categoryBreakdown} />
              ) : null}

              {summary.topMissedRewards.length > 0 ? (
                <View style={styles.section}>
                  <Text style={styles.sectionHeading}>Top missed rewards</Text>
                  {summary.topMissedRewards.map((item) => (
                    <MissedRewardCard
                      key={item.id}
                      item={item}
                      onPress={handleMissedRewardPress}
                    />
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No data for this period yet.</Text>
              <Text style={styles.emptySubtext}>
                Add transactions to start tracking your rewards.
              </Text>
            </View>
          )}
        </View>
      ) : !aiInsightsEnabled ? (
        <View style={styles.section}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>AI insights are a Pro feature.</Text>
            <Text style={styles.emptySubtext}>
              Get personalized reward optimization tips based on your spending patterns. Upgrade to unlock.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.generateButton}
            onPress={() => router.push({ pathname: "/(app)/billing", params: { requiredPlanCode: "pro" } })}
          >
            <Text style={styles.generateButtonLabel}>Upgrade to Pro</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.section}>
          {insightsLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : insights.length > 0 ? (
            insights.map((insight) => (
              <AIInsightCard key={insight.id} insight={insight} onDismiss={dismiss} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No AI insights yet.</Text>
              <Text style={styles.emptySubtext}>
                Generate personalized reward optimization tips based on your spending.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.generateButton, generating && styles.generateButtonDisabled]}
            onPress={() => generate()}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator color={colors.primaryText} />
            ) : (
              <Text style={styles.generateButtonLabel}>Generate new insights</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    marginBottom: spacing.md
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: "transparent"
  },
  tabActive: {
    borderBottomColor: colors.primary
  },
  tabLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600"
  },
  tabLabelActive: {
    color: colors.primary
  },
  subTabRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: spacing.sm
  },
  subTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm
  },
  subTabActive: {
    backgroundColor: colors.primary
  },
  subTabLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600"
  },
  subTabLabelActive: {
    color: colors.primaryText
  },
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xl
  },
  section: {
    gap: spacing.md
  },
  sectionHeading: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  loader: {
    marginVertical: spacing.xl
  },
  error: {
    color: colors.danger
  },
  emptyState: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xl
  },
  emptyText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700"
  },
  emptySubtext: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center"
  },
  generateButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    alignItems: "center",
    paddingVertical: spacing.md,
    marginTop: spacing.sm
  },
  generateButtonDisabled: {
    opacity: 0.6
  },
  generateButtonLabel: {
    color: colors.primaryText,
    fontSize: 15,
    fontWeight: "700"
  }
});
