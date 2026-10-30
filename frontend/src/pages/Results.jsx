import { useEffect, useState } from "react";
import api from "../services/api";

function Results() {
  const [candidates, setCandidates] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadResults = async () => {
      try {
        const response = await api.get("/results");

        if (response.data?.success === true) {
          setCandidates(
            response.data.candidates || []
          );

          setTotalVotes(
            response.data.total_votes || 0
          );
        } else {
          setError(
            response.data?.message ||
              "Unable to load results."
          );
        }
      } catch (err) {
        console.error(
          "Results error:",
          err
        );

        setError(
          err.response?.data?.detail ||
            "Unable to connect to results service."
        );
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, []);

  if (loading) {
    return (
      <div className="page">
        <h1>Election Results</h1>
        <p>Loading results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <h1>Election Results</h1>

        <p
          style={{
            color: "#c00000",
            fontWeight: "bold",
          }}
        >
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        <h1>Election Results</h1>

        <p>
          Total votes cast:{" "}
          <strong>{totalVotes}</strong>
        </p>

        <div
          style={{
            marginTop: "30px",
            display: "flex",
            flexDirection: "column",
            gap: "15px",
          }}
        >
          {candidates.map((candidate) => (
            <div
              key={candidate.id}
              style={{
                padding: "20px",
                border: "2px solid #29415c",
                borderRadius: "12px",
                background: "#0b1c30",
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

                  <p>
                    {candidate.party}
                  </p>
                </div>

                <strong
                  style={{
                    fontSize: "28px",
                  }}
                >
                  {candidate.votes}
                </strong>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Results;