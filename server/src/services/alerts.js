import { Alert } from "../models/Alert.js";
import { notify } from "./notify.js";

export async function matchWantedAlerts(listing) {
  const alerts = await Alert.find({ active: true, userId: { $ne: listing.sellerId } });
  const haystack = `${listing.title} ${listing.description} ${listing.category}`.toLowerCase();

  for (const alert of alerts) {
    const terms = alert.keywords.toLowerCase().split(/\s+/).filter(Boolean);
    const keywordHit = terms.every((t) => haystack.includes(t)) || terms.some((t) => haystack.includes(t));
    const categoryOk = !alert.category || alert.category === listing.category;
    const priceOk =
      !alert.maxPriceCents ||
      listing.startingPriceCents <= alert.maxPriceCents;
    if (keywordHit && categoryOk && priceOk) {
      await notify(alert.userId, {
        kind: "alert",
        listingId: listing._id,
        title: "Wanted item listed",
        body: `"${listing.title}" matches your alert for “${alert.keywords}”.`,
      });
    }
  }
}
