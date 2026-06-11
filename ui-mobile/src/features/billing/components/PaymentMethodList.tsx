import { scaleFont } from "@/shared/theme/typography";
import { StyleSheet, Text, View } from "react-native";
import { spacing } from "@/shared/theme/spacing";
import { useThemedStyles } from "@/providers/ThemeProvider";
import { PaymentMethod } from "@/features/billing/types/billing.types";

type Props = {
  paymentMethods: PaymentMethod[];
};

function formatExpiry(month?: number | null, year?: number | null): string | null {
  if (!month || !year) return null;
  const mm = month.toString().padStart(2, "0");
  const yy = year.toString().slice(-2);
  return `${mm}/${yy}`;
}

export function PaymentMethodList({ paymentMethods }: Props) {
  const styles = useThemedStyles((t) =>
    StyleSheet.create({
      list: { gap: spacing.xs },
      row: {
        alignItems: "center",
        backgroundColor: t.colors.surface,
        borderColor: t.colors.border,
        borderRadius: 8,
        borderWidth: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        padding: spacing.md
      },
      left: { flex: 1, gap: 2 },
      brand: { color: t.colors.text, fontSize: scaleFont(14), fontWeight: "700" },
      last: { color: t.colors.text, fontSize: scaleFont(13) },
      muted: { color: t.colors.muted, fontSize: scaleFont(12) },
      defaultBadge: { backgroundColor: t.colors.primary, borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 2 },
      defaultText: { color: t.palette.white, fontSize: scaleFont(12), fontWeight: "700" },
      empty: {
        backgroundColor: t.colors.surface,
        borderColor: t.colors.border,
        borderRadius: 8,
        borderWidth: 1,
        padding: spacing.md
      },
      emptyText: { color: t.colors.muted, fontSize: scaleFont(13) }
    })
  );

  if (paymentMethods.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No payment methods on file.</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {paymentMethods.map((pm) => {
        const brand = pm.brand ? pm.brand.toUpperCase() : "CARD";
        const last = pm.lastFour ? `•••• ${pm.lastFour}` : pm.stripePaymentMethodId;
        const expiry = formatExpiry(pm.expMonth, pm.expYear);
        return (
          <View key={pm.id} style={styles.row}>
            <View style={styles.left}>
              <Text style={styles.brand}>{brand}</Text>
              <Text style={styles.last}>{last}</Text>
              {expiry ? <Text style={styles.muted}>Exp {expiry}</Text> : null}
            </View>
            {pm.isDefault ? (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultText}>Default</Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
