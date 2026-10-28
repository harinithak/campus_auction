import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth } from "./auth.jsx";
import { api } from "./api.js";
import { getSocket } from "./socket.js";
import { popupPermission, requestPopupPermission, showBrowserPopup } from "./notifyBrowser.js";
import { AuthPage } from "./pages/AuthPage.jsx";
import { BrowsePage } from "./pages/BrowsePage.jsx";
import { ListingForm } from "./pages/ListingForm.jsx";
import { AuctionPage } from "./pages/AuctionPage.jsx";
import { MinePage } from "./pages/MinePage.jsx";
import { AlertsPage } from "./pages/AlertsPage.jsx";
import { AssistantPage } from "./pages/AssistantPage.jsx";

function Private({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function Nav() {
  const { user, logout } = useAuth();
  const [unread, setUnread] = useState(0);
  const [perm, setPerm] = useState(popupPermission());

  useEffect(() => {
    if (!user) return;
    const sock = getSocket();
    const onNote = (n) => {
      setUnread((c) => c + 1);
      showBrowserPopup(n.title, n.body);
    };
    sock.on("notification", onNote);
    api("/api/notifications")
      .then((d) => setUnread(d.notifications.filter((n) => !n.read).length))
      .catch(() => {});
    return () => sock.off("notification", onNote);
  }, [user]);

  return (
    <header className="nav">
      <Link className="brand" to="/">
        Campus Auction
      </Link>
      <Link to="/">Market</Link>
      {user && <Link to="/sell">Sell</Link>}
      {user && <Link to="/mine">My lots</Link>}
      {user && <Link to="/alerts">Wanted</Link>}
      {user && <Link to="/assistant">AI</Link>}
      <span className="spacer" />
      {user && (
        <button
          className="btn ghost"
          onClick={async () => {
            const r = await requestPopupPermission();
            setPerm(r);
          }}
        >
          {perm === "granted" ? "Pop-ups on" : "Enable pop-ups"}
        </button>
      )}
      {user && (
        <button
          className="btn ghost"
          onClick={async () => {
            await api("/api/notifications/read", { method: "POST" });
            setUnread(0);
          }}
        >
          Alerts {unread ? `(${unread})` : ""}
        </button>
      )}
      {user ? (
        <>
          <span className="muted">{user.name}</span>
          <button className="btn ghost" onClick={logout}>
            Sign out
          </button>
        </>
      ) : (
        <Link className="btn" to="/login">
          Sign in
        </Link>
      )}
    </header>
  );
}

export default function App() {
  const navigate = useNavigate();
  void navigate;
  return (
    <>
      <Nav />
      <main className="shell">
        <Routes>
          <Route path="/" element={<BrowsePage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route
            path="/sell"
            element={
              <Private>
                <ListingForm />
              </Private>
            }
          />
          <Route
            path="/listings/:id/edit"
            element={
              <Private>
                <ListingForm edit />
              </Private>
            }
          />
          <Route path="/auctions/:id" element={<AuctionPage />} />
          <Route
            path="/mine"
            element={
              <Private>
                <MinePage />
              </Private>
            }
          />
          <Route
            path="/alerts"
            element={
              <Private>
                <AlertsPage />
              </Private>
            }
          />
          <Route
            path="/assistant"
            element={
              <Private>
                <AssistantPage />
              </Private>
            }
          />
        </Routes>
      </main>
    </>
  );
}
