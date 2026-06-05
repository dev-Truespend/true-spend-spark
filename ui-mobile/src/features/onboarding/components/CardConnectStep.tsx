import { Text, View } from "react-native";
import { Button } from "@/shared/components/Button";
import { onboardingPanelStyles as styles } from "@/features/onboarding/components/onboardingStyles";
import { PlaidLinkButton } from "@/features/plaid/components/PlaidLinkButton";

type Props = {
  isLoading: boolean;
  cards: string[];
  onConnectPlaid: () => void;
  onBeginManual: () => void;
  onSkip: () => void;
};

export function CardConnectStep({ isLoading, cards, onConnectPlaid, onBeginManual, onSkip }: Props) {
  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Connect cards</Text>
      <Text style={styles.body}>TrueSpend uses read-only card metadata to compare rewards. It never asks for a full card number.</Text>
      <PlaidLinkButton disabled={isLoading} onPress={onConnectPlaid} label="Connect bank" />
      <Button disabled={isLoading} label="Add manually" onPress={onBeginManual} variant="secondary" />
      <Button disabled={isLoading} label="Skip for now" onPress={onSkip} variant="secondary" />
      {cards.map((card) => (
        <Text key={card} style={styles.listItem}>{card}</Text>
      ))}
    </View>
  );
}
