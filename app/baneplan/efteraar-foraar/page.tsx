import { PublicBaneplanPlaceholder } from "@/components/public-baneplan-placeholder";
import { findBaneplan } from "@/features/baneplan/plans";

export default function EfteraarForaarBaneplanPage() {
  const plan = findBaneplan("efteraar-foraar");

  if (!plan) {
    return null;
  }

  return <PublicBaneplanPlaceholder plan={plan} />;
}
