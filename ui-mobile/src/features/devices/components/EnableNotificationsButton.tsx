import { Button } from "@/shared/components/Button";

type Props = {
  disabled?: boolean;
  onEnable: () => void;
  label?: string;
};

export function EnableNotificationsButton({ disabled, onEnable, label = "Enable notifications" }: Props) {
  return <Button disabled={disabled} label={label} onPress={onEnable} />;
}
