import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Screen } from "@/shared/components/Screen";
import { Button } from "@/shared/components/Button";
import { TextInput as BaseTextInput } from "@/shared/components/TextInput";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";
import { createTransactionSchema, CreateTransactionFormInput } from "@/features/transactions/schemas/transactions.schema";
import { useCreateTransaction } from "@/features/transactions/hooks/useCreateTransaction";
import { useUpdateTransaction } from "@/features/transactions/hooks/useUpdateTransaction";
import { useTransactionDetail } from "@/features/transactions/hooks/useTransactionDetail";
import { useCardsList } from "@/features/cards/hooks/useCardsList";
import { useCatalogCategories } from "@/features/catalog/hooks/useCatalogCategories";
import { getCurrentCoords } from "@/shared/native/location";

type Mode = "create" | "edit";

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={fieldStyles.wrapper}>
      <Text style={fieldStyles.label}>{label}</Text>
      {children}
      {error ? <Text style={fieldStyles.error}>{error}</Text> : null}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  error: { color: colors.danger, fontSize: 12 }
});

export function TransactionFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const transactionId = id ? Number(id) : 0;
  const mode: Mode = transactionId > 0 ? "edit" : "create";
  const router = useRouter();

  const { transaction, isLoading: isLoadingDetail } = useTransactionDetail(transactionId);
  const { cards } = useCardsList();
  const categoriesQuery = useCatalogCategories();
  const categories = categoriesQuery.data?.data?.categories ?? [];
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction(transactionId);

  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting }
  } = useForm<CreateTransactionFormInput>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      merchantName: "",
      amount: 0,
      cardId: 0,
      categoryCode: "",
      transactionDate: new Date().toISOString().slice(0, 10)
    }
  });

  useEffect(() => {
    if (mode === "edit" && transaction) {
      reset({
        merchantName: transaction.merchantName,
        amount: transaction.amount.amount,
        cardId: transaction.card.id,
        categoryCode: transaction.categoryCode ?? "",
        transactionDate: transaction.transactionDate,
        transactionTime: transaction.transactionTime ?? undefined,
        locationLabel: transaction.locationLabel ?? undefined
      });
    }
  }, [transaction, mode, reset]);

  async function handleUseCurrentLocation() {
    setIsResolvingLocation(true);
    setLocationError(null);
    try {
      const coords = await getCurrentCoords();
      if (!coords) {
        setLocationError("Couldn't read your location. Enable location access in Settings.");
        return;
      }
      setValue("locationLat", coords.lat, { shouldValidate: true });
      setValue("locationLng", coords.lng, { shouldValidate: true });
      if (!getValues("locationLabel")) {
        setValue("locationLabel", `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
      }
    } finally {
      setIsResolvingLocation(false);
    }
  }

  async function onSubmit(data: CreateTransactionFormInput) {
    if (mode === "create") {
      await createMutation.mutateAsync(data);
    } else {
      await updateMutation.mutateAsync(data);
    }
    router.back();
  }

  if (mode === "edit" && isLoadingDetail) {
    return <Screen><ActivityIndicator color={colors.primary} style={styles.loader} /></Screen>;
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{mode === "create" ? "Add transaction" : "Edit transaction"}</Text>

        <Controller
          control={control}
          name="merchantName"
          render={({ field }) => (
            <FormField label="Merchant" error={errors.merchantName?.message}>
              <BaseTextInput placeholder="e.g. Amazon" value={field.value} onChangeText={field.onChange} />
            </FormField>
          )}
        />

        <Controller
          control={control}
          name="amount"
          render={({ field }) => (
            <FormField label="Amount" error={errors.amount?.message}>
              <BaseTextInput
                placeholder="0.00"
                value={field.value ? String(field.value) : ""}
                onChangeText={(v) => field.onChange(parseFloat(v) || 0)}
                keyboardType="decimal-pad"
              />
            </FormField>
          )}
        />

        <Controller
          control={control}
          name="transactionDate"
          render={({ field }) => (
            <FormField label="Date (YYYY-MM-DD)" error={errors.transactionDate?.message}>
              <BaseTextInput placeholder="2026-01-01" value={field.value} onChangeText={field.onChange} />
            </FormField>
          )}
        />

        <Controller
          control={control}
          name="transactionTime"
          render={({ field }) => (
            <FormField label="Time (HH:MM, optional)" error={errors.transactionTime?.message}>
              <BaseTextInput
                placeholder="14:30"
                value={field.value ?? ""}
                onChangeText={(v) => field.onChange(v.trim().length === 0 ? null : v)}
              />
            </FormField>
          )}
        />

        <Controller
          control={control}
          name="cardId"
          render={({ field }) => (
            <FormField label="Card" error={errors.cardId?.message}>
              <View style={styles.cardList}>
                {cards.map((card) => (
                  <TouchableOpacity
                    key={card.id}
                    style={[styles.cardOption, field.value === card.id && styles.cardOptionSelected]}
                    onPress={() => field.onChange(card.id)}
                  >
                    <Text style={[styles.cardOptionText, field.value === card.id && styles.cardOptionTextSelected]}>
                      {card.displayName}{card.lastFour ? ` ···${card.lastFour}` : ""}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </FormField>
          )}
        />

        <Controller
          control={control}
          name="categoryCode"
          render={({ field }) => (
            <FormField label="Category" error={errors.categoryCode?.message}>
              <View style={styles.cardList}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.code}
                    style={[styles.cardOption, field.value === c.code && styles.cardOptionSelected]}
                    onPress={() => field.onChange(c.code)}
                  >
                    <Text style={[styles.cardOptionText, field.value === c.code && styles.cardOptionTextSelected]}>
                      {c.displayName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </FormField>
          )}
        />

        <Controller
          control={control}
          name="locationLabel"
          render={({ field }) => (
            <FormField label="Location (optional)" error={errors.locationLabel?.message}>
              <BaseTextInput placeholder="e.g. New York, NY" value={field.value ?? ""} onChangeText={field.onChange} />
            </FormField>
          )}
        />
        <Button
          label={isResolvingLocation ? "Reading location…" : "Use current location"}
          onPress={() => void handleUseCurrentLocation()}
          variant="secondary"
          disabled={isResolvingLocation}
        />
        {locationError ? <Text style={styles.mutationError}>{locationError}</Text> : null}

        {(createMutation.error || updateMutation.error) ? (
          <Text style={styles.mutationError}>
            {((createMutation.error || updateMutation.error) as Error).message}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <Button
            label={mode === "create" ? "Save transaction" : "Save changes"}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: spacing.xl },
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  title: { color: colors.text, fontSize: 24, fontWeight: "800", marginBottom: spacing.sm },
  mutationError: { color: colors.danger },
  footer: { marginTop: spacing.md },
  cardList: { gap: spacing.xs },
  cardOption: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  cardOptionSelected: { borderColor: colors.primary, backgroundColor: colors.primary + "18" },
  cardOptionText: { color: colors.text, fontSize: 14 },
  cardOptionTextSelected: { color: colors.primary, fontWeight: "600" }
});
