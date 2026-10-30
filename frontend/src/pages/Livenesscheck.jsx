import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function LivenessCheck() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/liveness-detection", {
        replace: true,
      });
    }, 1500);

    return () => {
      clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: "20px",
      }}
    >
      <h1>Liveness Check</h1>

      <div
        style={{
          marginTop: "20px",
          fontSize: "50px",
        }}
      >
        ✓
      </div>

      <h2>
        Face Verification Successful
      </h2>

      <p>
        Preparing liveness detection...
      </p>

      <div
        style={{
          marginTop: "25px",
          padding: "15px 30px",
          borderRadius: "10px",
          background: "#eef4ff",
          color: "#1455a0",
          fontWeight: "bold",
        }}
      >
        Starting automatically...
      </div>
    </div>
  );
}

export default LivenessCheck;