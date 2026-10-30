import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function Confirmation() {
  const navigate = useNavigate();

  const [candidate, setCandidate] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const savedCandidate =
      sessionStorage.getItem("selected_candidate");

    if (!savedCandidate) {
      setError(
        "No candidate has been selected. Please return to voting."
      );
      return;
    }

    try {
      const parsedCandidate =
        JSON.parse(savedCandidate);

      setCandidate(parsedCandidate);
    } catch (err) {
      console.error(
        "Candidate data error:",
        err
      );

      setError(
        "Unable to read the selected candidate."
      );
    }
  }, []);

  const handleConfirm = async () => {
    const voterId =
      sessionStorage.getItem("voter_id");

    if (!voterId) {
      setError(
        "Voter session not found. Please login again."
      );
      return;
    }

    if (!candidate) {
      setError(
        "No candidate selected."
      );
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await api.post(
        "/vote",
        {
          voter_id: Number(voterId),
          candidate_id: candidate.id,
        }
      );

      if (response.data?.success === true) {
        sessionStorage.removeItem(
          "selected_candidate"
        );

        navigate("/results", {
          replace: true,
        });
      } else {
        setError(
          response.data?.message ||
            "Vote submission failed."
        );
      }
    } catch (err) {
      console.error(
        "Vote submission error:",
        err
      );

      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          "Could not submit your vote."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (error && !candidate) {
    return (
      <div className="page">
        <h1>Vote Confirmation</h1>

        <div
          style={{
            marginTop: "25px",
            padding: "15px",
            borderRadius: "10px",
            background: "#ffeaea",
            color: "#c00000",
            fontWeight: "bold",
          }}
        >
          {error}
        </div>

        <button
          type="button"
          onClick={() => navigate("/voting")}
          style={{
            marginTop: "20px",
          }}
        >
          Return to Voting
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <div
        style={{
          maxWidth: "600px",
          margin: "0 auto",
        }}
      >
        <h1>Confirm Your Vote</h1>

        <p>
          Please review your selection before
          submitting your vote.
        </p>

        {candidate && (
          <div
            style={{
              marginTop: "30px",
              padding: "25px",
              borderRadius: "12px",
              border: "2px solid #29415c",
              background: "#0b1c30",
            }}
          >
            <p
              style={{
                margin: "0 0 10px",
                fontWeight: "bold",
              }}
            >
              Selected Candidate
            </p>

            <h2
              style={{
                margin: "0 0 8px",
              }}
            >
              {candidate.name}
            </h2>

            <p
              style={{
                margin: 0,
              }}
            >
              {candidate.party}
            </p>
          </div>
        )}

        <div
          style={{
            marginTop: "25px",
            padding: "15px",
            borderRadius: "10px",
            background: "#fff8e1",
            color: "#795500",
          }}
        >
          <strong>Important:</strong> Once your
          vote is submitted, it should not be
          changed.
        </div>

        {error && (
          <div
            style={{
              marginTop: "20px",
              padding: "15px",
              borderRadius: "10px",
              background: "#ffeaea",
              color: "#c00000",
              fontWeight: "bold",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleConfirm}
          disabled={
            submitting || !candidate
          }
          style={{
            marginTop: "30px",
            width: "100%",
            padding: "14px",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor:
              submitting || !candidate
                ? "not-allowed"
                : "pointer",
            opacity:
              submitting || !candidate
                ? 0.5
                : 1,
          }}
        >
          {submitting
            ? "Submitting Vote..."
            : "Confirm Vote"}
        </button>

        <button
          type="button"
          onClick={() => navigate("/voting")}
          disabled={submitting}
          style={{
            marginTop: "12px",
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
          }}
        >
          Change Selection
        </button>
      </div>
    </div>
  );
}

export default Confirmation;