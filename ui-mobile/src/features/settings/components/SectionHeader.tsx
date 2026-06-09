import { View } from "react-native";
import { SectionLabel } from "@/shared/components/SectionLabel";

export function SectionHeader({ title }: { title: string }) {
  return (
    <View style={{ marginTop: 14, marginBottom: 6 }}>
      <SectionLabel>{title}</SectionLabel>
    </View>
  );
}
