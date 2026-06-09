import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "@/shared/components/Card";
import { MiniCardSwatch, MiniCardSwatchVariant } from "@/shared/components/MiniCardSwatch";
import { SectionLabel } from "@/shared/components/SectionLabel";
import { colors } from "@/shared/theme/colors";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type RunnerUp = {
  card: { id: number; displayName: string; issuerName?: string; lastFour?: string | null };
  expectedReward: { display: string };
  reason?: string;
  rank: number;
};

type Props = { runnerUps: RunnerUp[]; onSelect?: (id: number) => void };

const VARIANTS: MiniCardSwatchVariant[] = ["brand", "purple", "cool", "gold", "dark"];

function variantFor(issuer: string | undefined, rank: number): MiniCardSwatchVariant {
  const lower = (issuer ?? "").toLowerCase();
  if (lower.includes("amex") || lower.includes("american express")) return "purple";
  if (lower.includes("chase")) return "brand";
  if (lower.includes("citi")) return "cool";
  if (lower.includes("capital one")) return "gold";
  if (lower.includes("apple")) return "dark";
  return VARIANTS[rank % VARIANTS.length];
}

function swatchLabelFor(issuer: string | undefined, displayName: string): string {
  const source = issuer && issuer.length > 0 ? issuer : displayName;
  return source.toUpperCase().slice(0, 6);
}

export function RunnerUpList({ runnerUps, onSelect }: Props) {
  if (runnerUps.length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      <SectionLabel>Other good options here</SectionLabel>
      <Card>
        {runnerUps.map((r, i) => {
          const row = (
            <View
              style={[styles.row, i < runnerUps.length - 1 && styles.divider]}
              key={r.card.id}
            >
              <MiniCardSwatch
                label={swatchLabelFor(r.card.issuerName, r.card.displayName)}
                variant={variantFor(r.card.issuerName, i)}
              />
              <View style={styles.body}>
                <Text style={styles.title} numberOfLines={1}>{r.card.displayName}</Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {[r.card.issuerName, r.card.lastFour ? `•• ${r.card.lastFour}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
                {r.reason ? (
                  <Text style={styles.meta} numberOfLines={1}>{r.reason}</Text>
                ) : null}
              </View>
              <Text style={styles.amount}>{r.expectedReward.display}</Text>
            </View>
          );
          return onSelect ? (
            <Pressable
              key={r.card.id}
              accessibilityRole="button"
              onPress={() => onSelect(r.card.id)}
              style={({ pressed }) => pressed && styles.pressed}
            >
              {row}
            </Pressable>
          ) : (
            row
          );
        })}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  body: { flex: 1, minWidth: 0 },
  title: { fontFamily: fontFamily.semibold, fontWeight: "600", fontSize: scaleFont(14), color: colors.text },
  meta: { fontFamily: fontFamily.regular, fontSize: scaleFont(11), color: colors.mutedFg, marginTop: 2 },
  amount: { fontFamily: fontFamily.bold, fontSize: scaleFont(14), fontWeight: "700", color: colors.primary, marginLeft: 8 },
  pressed: { opacity: 0.7 }
});
