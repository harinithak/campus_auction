import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";

export function AuthPage({ mode }) {
  const { user, login, register } = useAuth();
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", campus: "Main Campus" });
  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      if (mode === "login") await login(form.email, form.password);
      else await register(form);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="authbox card">
      <div className="body">
        <h1>{mode === "login" ? "Sign in" : "Create a student account"}</h1>
        <p className="lead">Campus clock, public bid history, no silent sniping.</p>
        <form className="stack" onSubmit={onSubmit}>
          {mode === "register" && (
            <>
              <label>
                Name
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </label>
              <label>
                Campus
                <input value={form.campus} onChange={(e) => setForm({ ...form, campus: e.target.value })} />
              </label>
            </>
          )}
          <label>
            Email
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </label>
          <label>
            Password
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </label>
          {error && <div className="error">{error}</div>}
          <button className="btn gold" type="submit">
            {mode === "login" ? "Enter campus" : "Join Campus Auction"}
          </button>
        </form>
        <p className="muted">
          {mode === "login" ? (
            <>
              New here? <Link to="/register">Register</Link>
            </>
          ) : (
            <>
              Already registered? <Link to="/login">Sign in</Link>
            </>
          )}
        </p>
        <p className="muted">Demo: maya@campus.edu / leo@campus.edu / priya@campus.edu — password123</p>
      </div>
    </div>
  );
}
