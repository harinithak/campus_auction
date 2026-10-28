import { Notification } from "../models/Notification.js";
import { emitUser } from "../realtime.js";

export async function notify(userId, { title, body, listingId = null, kind }) {
  const doc = await Notification.create({
    userId,
    title,
    body,
    listingId,
    kind,
  });
  const payload = {
    id: String(doc._id),
    title,
    body,
    listingId,
    kind,
    read: false,
    createdAt: doc.createdAt,
  };
  emitUser(String(userId), "notification", payload);
  return doc;
}

export async function notifyMany(userIds, data) {
  const unique = [...new Set(userIds.map(String))];
  await Promise.all(unique.map((id) => notify(id, data)));
}
