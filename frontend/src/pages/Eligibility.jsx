import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function Eligibility() {
  const navigate = useNavigate();

  const [status, setStatus] = useState(
    "Checking your eligibility..."
  );
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const checkEligibility = async () => {
      const voterId =
        sessionStorage.getItem("voter_id");

      if (!voterId) {
        setError(
          "Voter session not found. Please login again."
        );
        setStatus("Eligibility check failed.");
        return;
      }

      try {
        setStatus(
          "Checking voter eligibility..."
        );
        setError("");

        const response = await api.post(
          "/eligibility",
          null,
          {
            params: {
              voter_id: voterId,
            },
          }
        );

        if (!mounted) {
          return;
        }

        if (response.data?.eligible === true) {
          setStatus(
            "You are eligible to vote."
          );

          setTimeout(() => {
            navigate("/voting", {
              replace: true,
            });
          }, 1000);
        } else {
          setStatus(
            "Eligibility check failed."
          );

          setError(
            response.data?.message ||
              "You are not eligible to vote."
          );
        }
      } catch (err) {
        console.error(
          "Eligibility check error:",
          err
        );

        if (!mounted) {
          return;
        }

        setStatus(
          "Unable to check eligibility."
        );

        setError(
          err.response?.data?.detail ||
            err.response?.data?.message ||
            "Could not connect to the eligibility service."
        );
      }
    };

    checkEligibility();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  return (
    <div className="page">
      <h1>Voter Eligibility</h1>

      <p>{status}</p>

      {!error && (
        <div
          style={{
            marginTop: "25px",
            padding: "15px 25px",
            borderRadius: "10px",
            background: "#eef4ff",
            color: "#1455a0",
            fontWeight: "bold",
            display: "inline-block",
          }}
        >
          Please wait...
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: "25px",
            padding: "15px 25px",
            borderRadius: "10px",
            background: "#ffeaea",
            color: "#c00000",
            fontWeight: "bold",
            display: "inline-block",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

export default Eligibility;