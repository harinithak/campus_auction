export async function requestPopupPermission() {
  if (!("Notification" in window)) throw new Error("This browser has no notification API");
  const result = await Notification.requestPermission();
  localStorage.setItem("quadbid_push", result);
  return result;
}

export function popupPermission() {
  return localStorage.getItem("quadbid_push") || ("Notification" in window ? Notification.permission : "denied");
}

export function showBrowserPopup(title, body) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body });
  } catch {
    /* ignore */
  }
}
