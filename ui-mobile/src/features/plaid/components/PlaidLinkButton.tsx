import { Button } from "@/shared/components/Button";

type Props = {
  disabled?: boolean;
  onPress: () => void;
  label?: string;
};

export function PlaidLinkButton({ disabled, onPress, label = "Connect bank with Plaid" }: Props) {
  return <Button disabled={disabled} label={label} onPress={onPress} />;
}
