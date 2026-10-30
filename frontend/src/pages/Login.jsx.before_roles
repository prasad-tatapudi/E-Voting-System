import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await api.post("/login", {
        email,
        password,
      });

      console.log("Login response:", response.data);

      if (response.data?.success === true) {
        // Store the logged-in voter ID
        sessionStorage.setItem(
          "voter_id",
          String(response.data.voter_id)
        );

        sessionStorage.setItem(
          "voter_name",
          response.data.name
        );

        sessionStorage.setItem(
          "voter_email",
          response.data.email
        );

        navigate("/face-verification");
      } else {
        setError(
          response.data?.message ||
            "Login failed."
        );
      }
    } catch (err) {
      console.error("Login error:", err);

      setError(
        err.response?.data?.detail ||
          "Could not connect to the login service."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Voter Login</h1>

        <p className="subtitle">
          AI & Blockchain Voting System
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">
              Email
            </label>

            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              Password
            </label>

            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
            />
          </div>

          {error && (
            <div
              style={{
                marginBottom: "15px",
                padding: "12px",
                borderRadius: "8px",
                background: "#ffeaea",
                color: "#c00000",
                fontWeight: "bold",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Logging in..."
              : "Login"}
          </button>
        </form>

        <p className="bottom-text">
          Don't have an account?{" "}
          <Link to="/register">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;