import { Link } from "react-router-dom";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface UserCardTileData {
  id: string;
  display_name: string;
  issuer?: string | null;
  network?: string | null;
  last4?: string | null;
  rewards_confirmed_by_user: boolean;
}

export function UserCardTile({ card }: { card: UserCardTileData }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{card.display_name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {[card.issuer, card.network, card.last4 ? `•••• ${card.last4}` : null].filter(Boolean).join(" · ")}
            </p>
          </div>
          <Badge variant={card.rewards_confirmed_by_user ? "default" : "secondary"}>
            {card.rewards_confirmed_by_user ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <CircleDashed className="mr-1 h-3 w-3" />}
            {card.rewards_confirmed_by_user ? "Confirmed" : "Review"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to={`/app/cards/${card.id}`}>Details</Link>
        </Button>
        <Button asChild size="sm">
          <Link to={`/app/cards/${card.id}/rewards`}>Edit rewards</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
