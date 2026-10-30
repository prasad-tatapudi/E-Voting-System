import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function FaceVerification() {
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const processingRef = useRef(false);
  const canvasRef = useRef(document.createElement("canvas"));

  const [status, setStatus] = useState("Starting camera...");
  const [error, setError] = useState("");

  const voterId = sessionStorage.getItem("voter_id");

  useEffect(() => {
    if (!voterId) {
      setError("Voter session not found. Please login again.");
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setStatus("Look at the camera...");

      // Give the camera a moment to stabilize.
      setTimeout(() => {
        startVerificationLoop();
      }, 1000);
    } catch (err) {
      console.error("Camera error:", err);
      setError("Unable to access camera. Please allow camera permission.");
    }
  };

  const startVerificationLoop = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Try once every 2.5 seconds instead of continuously.
    timerRef.current = setInterval(() => {
      verifyFace();
    }, 2500);

    // First attempt immediately.
    verifyFace();
  };

  const verifyFace = async () => {
    if (processingRef.current) {
      return;
    }

    if (!videoRef.current || videoRef.current.readyState < 2) {
      return;
    }

    processingRef.current = true;
    setStatus("Verifying face...");
    setError("");

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Send a smaller image to reduce upload + processing time.
      const maxWidth = 640;
      const scale = Math.min(1, maxWidth / video.videoWidth);

      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);

      const ctx = canvas.getContext("2d");

      ctx.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
      );

      const blob = await new Promise((resolve) => {
        canvas.toBlob(
          resolve,
          "image/jpeg",
          0.75
        );
      });

      if (!blob) {
        throw new Error("Could not capture camera image.");
      }

      const formData = new FormData();

      formData.append("voter_id", voterId);
      formData.append("file", blob, "face.jpg");

      const response = await api.post(
        "/face-verification",
        formData
      );

      const data = response.data;

      console.log("Face verification:", data);

      if (data.success && data.verified) {
        setStatus(
          `Face verified (${data.similarity?.toFixed(2) ?? ""})`
        );

        stopCamera();

        // Small delay so user can see successful verification.
        setTimeout(() => {
          navigate("/liveness-check");
        }, 500);

        return;
      }

      if (data.success === false && data.verified === false) {
        setStatus("Face not recognized. Please look at the camera.");
      } else {
        setStatus("Checking face...");
      }
    } catch (err) {
      console.error("Face verification error:", err);

      const message =
        err.response?.data?.detail ||
        "Unable to verify face. Please try again.";

      setError(message);
      setStatus("Verification failed.");
    } finally {
      processingRef.current = false;
    }
  };

  const stopCamera = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;
    }
  };

  return (
    <div className="page">
      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <h1>Face Verification</h1>

        <p>{status}</p>

        <div
          style={{
            marginTop: "20px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: "100%",
              maxWidth: "640px",
              borderRadius: "12px",
              border: "2px solid #29415c",
            }}
          />
        </div>

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

        <button
          onClick={stopCamera}
          style={{
            marginTop: "20px",
            padding: "10px 20px",
          }}
        >
          Stop Camera
        </button>
      </div>
    </div>
  );
}

export default FaceVerification;