import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FaceLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";

function LivenessDetection() {
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const animationRef = useRef(null);

  const [modelLoaded, setModelLoaded] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [message, setMessage] = useState(
    "Loading liveness detection..."
  );
  const [error, setError] = useState("");
  const [blinkCount, setBlinkCount] = useState(0);
  const [livenessVerified, setLivenessVerified] =
    useState(false);

  const eyesClosedRef = useRef(false);
  const lastBlinkTimeRef = useRef(0);
  const livenessVerifiedRef = useRef(false);

  const openEarSamplesRef = useRef([]);
  const baselineEARRef = useRef(null);

  const closedFramesRef = useRef(0);
  const openFramesRef = useRef(0);
  const eyesClosedStartTimeRef = useRef(0);

  // ==========================================
  // LOAD MEDIAPIPE
  // ==========================================

  useEffect(() => {
    let mounted = true;

    const loadModel = async () => {
      try {
        setMessage("Loading liveness model...");

        const vision =
          await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
          );

        const landmarker =
          await FaceLandmarker.createFromOptions(
            vision,
            {
              baseOptions: {
                modelAssetPath:
                  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",

                delegate: "GPU",
              },

              runningMode: "VIDEO",

              numFaces: 1,

              minFaceDetectionConfidence: 0.5,
              minFacePresenceConfidence: 0.5,
              minTrackingConfidence: 0.5,
            }
          );

        if (!mounted) {
          landmarker.close();
          return;
        }

        landmarkerRef.current = landmarker;

        setModelLoaded(true);
        setMessage(
          "Liveness model ready. Starting camera..."
        );
      } catch (err) {
        console.error(
          "MediaPipe loading error:",
          err
        );

        setError(
          "Unable to load the liveness detection model."
        );
      }
    };

    loadModel();

    return () => {
      mounted = false;

      if (animationRef.current) {
        cancelAnimationFrame(
          animationRef.current
        );
      }

      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
  }, []);

  // ==========================================
  // AUTOMATIC CAMERA START
  // ==========================================

  useEffect(() => {
    if (!modelLoaded) {
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [modelLoaded]);

  // ==========================================
  // START CAMERA
  // ==========================================

  const startCamera = async () => {
    try {
      setError("");

      setBlinkCount(0);
      setLivenessVerified(false);

      livenessVerifiedRef.current = false;

      eyesClosedRef.current = false;
      lastBlinkTimeRef.current = 0;

      openEarSamplesRef.current = [];
      baselineEARRef.current = null;

      closedFramesRef.current = 0;
      openFramesRef.current = 0;
      eyesClosedStartTimeRef.current = 0;

      setMessage(
        "Starting camera..."
      );

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: 640,
            height: 480,
          },
          audio: false,
        });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        await videoRef.current.play();
      }

      setCameraStarted(true);

      setMessage(
        "Keep your eyes open for calibration..."
      );
    } catch (err) {
      console.error(
        "Camera error:",
        err
      );

      setError(
        "Camera permission was denied or the camera is unavailable."
      );
    }
  };

  // ==========================================
  // CALCULATE EAR
  // ==========================================

  const calculateEAR = (
    landmarks,
    topPoints,
    bottomPoints,
    leftPoint,
    rightPoint
  ) => {
    const vertical1 = Math.hypot(
      landmarks[topPoints[0]].x -
        landmarks[bottomPoints[0]].x,

      landmarks[topPoints[0]].y -
        landmarks[bottomPoints[0]].y
    );

    const vertical2 = Math.hypot(
      landmarks[topPoints[1]].x -
        landmarks[bottomPoints[1]].x,

      landmarks[topPoints[1]].y -
        landmarks[bottomPoints[1]].y
    );

    const horizontal = Math.hypot(
      landmarks[leftPoint].x -
        landmarks[rightPoint].x,

      landmarks[leftPoint].y -
        landmarks[rightPoint].y
    );

    if (horizontal === 0) {
      return 0;
    }

    return (
      (vertical1 + vertical2) /
      (2 * horizontal)
    );
  };

  // ==========================================
  // DETECT BLINK
  // ==========================================

  const detectBlink = (result) => {
    if (livenessVerifiedRef.current) {
      return;
    }

    if (!result.faceLandmarks?.length) {
      setMessage(
        "No face detected. Look at the camera."
      );

      return;
    }

    const landmarks =
      result.faceLandmarks[0];

    const leftEAR = calculateEAR(
      landmarks,
      [159, 160],
      [145, 144],
      33,
      133
    );

    const rightEAR = calculateEAR(
      landmarks,
      [386, 387],
      [374, 373],
      362,
      263
    );

    const averageEAR =
      (leftEAR + rightEAR) / 2;

    // ==========================================
    // CALIBRATION
    // ==========================================

    if (baselineEARRef.current === null) {
      openEarSamplesRef.current.push(
        averageEAR
      );

      setMessage(
        "Keep your eyes open for calibration..."
      );

      if (
        openEarSamplesRef.current.length >= 30
      ) {
        const samples =
          openEarSamplesRef.current;

        const average =
          samples.reduce(
            (sum, value) => sum + value,
            0
          ) / samples.length;

        baselineEARRef.current = average;

        setMessage(
          "Calibration complete. Please blink once."
        );
      }

      return;
    }

    // ==========================================
    // ADAPTIVE THRESHOLD
    // ==========================================

    const closedThreshold =
      baselineEARRef.current * 0.72;

    const eyesClosed =
      averageEAR < closedThreshold;

    // ==========================================
    // EYES CLOSED
    // ==========================================

    if (eyesClosed) {
      closedFramesRef.current += 1;
      openFramesRef.current = 0;

      if (!eyesClosedRef.current) {
        eyesClosedStartTimeRef.current =
          Date.now();
      }

      if (closedFramesRef.current >= 4) {
        eyesClosedRef.current = true;

        setMessage(
          "Eyes closed — now open your eyes."
        );
      }

      return;
    }

    // ==========================================
    // EYES OPEN AGAIN
    // ==========================================

    if (eyesClosedRef.current) {
      openFramesRef.current += 1;

      if (openFramesRef.current >= 4) {
        const now = Date.now();

        const closedDuration =
          now -
          eyesClosedStartTimeRef.current;

        if (
          closedDuration >= 120 &&
          now - lastBlinkTimeRef.current > 700
        ) {
          lastBlinkTimeRef.current = now;

          eyesClosedRef.current = false;

          closedFramesRef.current = 0;
          openFramesRef.current = 0;

          setBlinkCount(1);

          setLivenessVerified(true);

          livenessVerifiedRef.current = true;

          setMessage(
            "Liveness verified successfully."
          );

          // Stop processing
          if (animationRef.current) {
            cancelAnimationFrame(
              animationRef.current
            );
          }

          // Continue automatically
          setTimeout(() => {
            stopCamera();

            navigate("/eligibility", {
              replace: true,
            });
          }, 1000);
        }
      }

      return;
    }

    setMessage(
      "Please blink once."
    );
  };

  // ==========================================
  // PROCESS VIDEO
  // ==========================================

  const processVideo = () => {
    if (
      !videoRef.current ||
      !landmarkerRef.current ||
      videoRef.current.readyState <
        HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
      animationRef.current =
        requestAnimationFrame(
          processVideo
        );

      return;
    }

    if (livenessVerifiedRef.current) {
      return;
    }

    const video = videoRef.current;

    const now = performance.now();

    try {
      const result =
        landmarkerRef.current.detectForVideo(
          video,
          now
        );

      detectBlink(result);
    } catch (err) {
      console.error(
        "Liveness processing error:",
        err
      );
    }

    if (!livenessVerifiedRef.current) {
      animationRef.current =
        requestAnimationFrame(
          processVideo
        );
    }
  };

  // ==========================================
  // START VIDEO PROCESSING
  // ==========================================

  useEffect(() => {
    if (
      !cameraStarted ||
      !modelLoaded
    ) {
      return;
    }

    animationRef.current =
      requestAnimationFrame(
        processVideo
      );

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(
          animationRef.current
        );
      }
    };
  }, [
    cameraStarted,
    modelLoaded,
  ]);

  // ==========================================
  // STOP CAMERA
  // ==========================================

  const stopCamera = () => {
    if (animationRef.current) {
      cancelAnimationFrame(
        animationRef.current
      );

      animationRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraStarted(false);
  };

  // ==========================================
  // UI
  // ==========================================

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "40px 20px",
        textAlign: "center",
      }}
    >
      <h1>
        AI Liveness Detection
      </h1>

      <p>
        Please look at the camera and blink once.
      </p>

      <div
        style={{
          width: "500px",
          height: "375px",
          maxWidth: "100%",
          margin: "30px auto",
          border: "3px solid #333",
          borderRadius: "15px",
          overflow: "hidden",
          background: "#111",
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>

      <div
        style={{
          margin: "25px auto",
          maxWidth: "500px",
          padding: "15px",
          borderRadius: "8px",
          background: livenessVerified
            ? "#e8f8ee"
            : "#eef4ff",
          color: livenessVerified
            ? "#16803c"
            : "#1455a0",
          fontWeight: "bold",
        }}
      >
        {message}
      </div>

      <p>
        Blinks detected:{" "}
        <strong>{blinkCount}</strong>
      </p>

      {error && (
        <div
          style={{
            margin: "20px auto",
            maxWidth: "500px",
            padding: "15px",
            borderRadius: "8px",
            background: "#ffeaea",
            color: "#d00000",
            fontWeight: "bold",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

export default LivenessDetection;