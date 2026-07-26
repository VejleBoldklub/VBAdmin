import { PublicBaneplanPlaceholder } from "@/components/public-baneplan-placeholder";
import { findBaneplan } from "@/features/baneplan/plans";

export default function VinterBaneplanPage() {
  const plan = findBaneplan("vinter");

  if (!plan) {
    return null;
  }

  return <PublicBaneplanPlaceholder plan={plan} />;
}
