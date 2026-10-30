import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function Voting() {
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const voterId = sessionStorage.getItem("voter_id");

  const candidates = [
    {
      id: 1,
      name: "Candidate A",
      party: "Party A",
    },
    {
      id: 2,
      name: "Candidate B",
      party: "Party B",
    },
    {
      id: 3,
      name: "Candidate C",
      party: "Party C",
    },
  ];

  const handleVote = async (candidate) => {
    if (submitting) {
      return;
    }

    if (!voterId) {
      setError("Voter session not found. Please login again.");
      return;
    }

    const confirmed = window.confirm(
      `Submit your vote for ${candidate.name} (${candidate.party})?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const response = await api.post("/vote", {
        voter_id: Number(voterId),
        candidate_id: candidate.id,
      });

      if (response.data?.success) {
        // Store selected candidate for confirmation page
        sessionStorage.setItem(
          "selected_candidate",
          JSON.stringify(candidate)
        );

        navigate("/confirmation");
      } else {
        setError(
          response.data?.message || "Unable to submit your vote."
        );
      }
    } catch (err) {
      console.error("Vote submission error:", err);

      setError(
        err.response?.data?.detail ||
          "Unable to submit your vote. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <h1>Cast Your Vote</h1>

        <p>
          Select a candidate to submit your vote.
        </p>

        {submitting && (
          <p
            style={{
              fontWeight: "bold",
              marginTop: "20px",
            }}
          >
            Submitting your vote...
          </p>
        )}

        {error && (
          <p
            style={{
              color: "#c00000",
              fontWeight: "bold",
              marginTop: "20px",
            }}
          >
            {error}
          </p>
        )}

        <div
          style={{
            marginTop: "30px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {candidates.map((candidate) => (
            <button
              key={candidate.id}
              onClick={() => handleVote(candidate)}
              disabled={submitting}
              style={{
                padding: "25px",
                border: "2px solid #29415c",
                borderRadius: "12px",
                background: "#0b1c30",
                color: "white",
                cursor: submitting ? "not-allowed" : "pointer",
                textAlign: "left",
                opacity: submitting ? 0.6 : 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <h2 style={{ margin: 0 }}>
                    {candidate.name}
                  </h2>

                  <p style={{ marginTop: "8px" }}>
                    {candidate.party}
                  </p>
                </div>

                <span
                  style={{
                    fontSize: "28px",
                  }}
                >
                  →
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Voting;