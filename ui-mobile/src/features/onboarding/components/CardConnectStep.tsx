import { View } from "react-native";
import { Button } from "@/shared/components/Button";
import { Card } from "@/shared/components/Card";
import { ReasonCard } from "@/shared/components/ReasonCard";
import { ListItem } from "@/shared/components/ListItem";
import { SectionLabel } from "@/shared/components/SectionLabel";
import { OnboardingHero } from "./OnboardingHero";
import { StepHeader } from "./StepHeader";
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
    <View style={{ gap: 12 }}>
      <StepHeader step={1} totalSteps={4} onSkip={onSkip} />
      <OnboardingHero
        iconLabel="🏦"
        title="Connect your bank"
        description="We use Plaid to securely identify your cards and account metadata. Read-only — we never see your password and can't move money."
      />

      <View style={{ gap: 8 }}>
        <PlaidLinkButton disabled={isLoading} onPress={onConnectPlaid} label="🔒 Connect with Plaid" />
        <Button disabled={isLoading} label="Add cards manually instead" onPress={onBeginManual} variant="outline" />
      </View>

      <ReasonCard
        icon="🛡️"
        title="Why we ask"
        body="We need to know which cards you carry to recommend the best one. We never need your full card number — just issuer and product."
      />
      <ReasonCard
        icon="🔐"
        tone="blue"
        title="Bank-level security"
        body="256-bit encryption · used by Venmo, Robinhood, Coinbase · SOC 2 certified."
      />

      {cards.length ? (
        <Card>
          <SectionLabel>Connected so far</SectionLabel>
          {cards.map((card, i) => (
            <ListItem key={card + i} title={card} iconLabel="✓" iconTone="green" divider={i < cards.length - 1} />
          ))}
        </Card>
      ) : null}
    </View>
  );
}
