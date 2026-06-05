import { useLocalSearchParams } from "expo-router";
import { CardDetailScreen } from "@/features/cards/screens/CardDetailScreen";

export default function CardDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CardDetailScreen cardId={Number(id)} />;
}
