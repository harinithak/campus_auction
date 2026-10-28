let ioRef = null;

export function setIo(io) {
  ioRef = io;
}

export function emitListing(listingId, event, payload) {
  if (!ioRef) return;
  ioRef.to(`listing:${listingId}`).emit(event, payload);
}

export function emitUser(userId, event, payload) {
  if (!ioRef) return;
  ioRef.to(`user:${userId}`).emit(event, payload);
}
