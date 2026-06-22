import { Badge } from "@/components/ui/badge";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

export const useDebtorRatingStatus = () => {
  const getRatingBadge = (rating: "high" | "medium" | "critical") => {
    switch (rating) {
      case "high":
        return (
          <Badge className="bg-green-500">
            <TrendingUp className="mr-1 h-3 w-3" />
            Yaxshi
          </Badge>
        );
      case "medium":
        return (
          <Badge className="bg-yellow-500">
            <Minus className="mr-1 h-3 w-3" />
            O&apos;rtacha
          </Badge>
        );
      case "critical":
        return (
          <Badge variant="destructive">
            <TrendingDown className="mr-1 h-3 w-3" />
            Yomon
          </Badge>
        );
    }
  };

  return {
    rating: getRatingBadge,
  };
};
