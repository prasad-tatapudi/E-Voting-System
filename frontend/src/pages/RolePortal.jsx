import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const roles = [
  { id: "user", label: "User / Voter", desc: "Self-registration and election information only", icon: "👤" },
  { id: "candidate", label: "Candidate", desc: "Constituency overview and published results", icon: "🏛️" },
  { id: "employee", label: "Polling Employee", desc: "Authorized polling-booth workflow", icon: "🪪" },
];

const demoCandidates = [
  { name: "Candidate A", party: "People's Development Party", symbol: "🌾" },
  { name: "Candidate B", party: "Progress Alliance", symbol: "🪷" },
  { name: "Candidate C", party: "Community Front", symbol: "⭐" },
];

const shell = { minHeight: "100vh", background: "#f4f7fb", color: "#17263c", fontFamily: "Inter, Arial, sans-serif" };
const button = { border: 0, borderRadius: 10, background: "#155eef", color: "white", padding: "12px 16px", fontWeight: 700, cursor: "pointer" };
const input = { width: "100%", padding: "12px 13px", border: "1px solid #ccd6e3", borderRadius: 9, fontSize: 15, marginTop: 6, background: "white", color: "#17263c" };

export default function RolePortal() {
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("user");
  const [loggedIn, setLoggedIn] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "", employeeId: "", nomination: "", aadhaar: "", otp: "", blind: "no", dob: "", address: "", city: "", voterId: "", constituency: "Guntur", area: "Central" });
  const [otpSent, setOtpSent] = useState(false);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [faceDemoVerified, setFaceDemoVerified] = useState(false);
  const [fingerprintDemoVerified, setFingerprintDemoVerified] = useState(false);
  const [faceCapture, setFaceCapture] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [liveChallenge, setLiveChallenge] = useState("Look directly at the camera, then slowly turn your head left and back to center.");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [certificateFile, setCertificateFile] = useState(null);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [selectedVoter, setSelectedVoter] = useState(null);
  const [voteConfirmed, setVoteConfirmed] = useState(false);
  const [candidate, setCandidate] = useState("");

  // ── Employee-assisted voter registration state ──
  const [empRegPanel, setEmpRegPanel] = useState(false); // show/hide panel
  const [empRegStep, setEmpRegStep] = useState(0);       // 0=details,1=biometric,2=done
  const [empRegMsg, setEmpRegMsg] = useState("");
  const [empRegSuccess, setEmpRegSuccess] = useState(false);
  const [empOtpSent, setEmpOtpSent] = useState(false);
  const [empOtpVerified, setEmpOtpVerified] = useState(false);
  const [empFaceVerified, setEmpFaceVerified] = useState(false);
  const [empFpVerified, setEmpFpVerified] = useState(false);
  const [empCertFile, setEmpCertFile] = useState(null);
  const empVideoRef = useRef(null);
  const empStreamRef = useRef(null);
  const empCanvasRef = useRef(null);
  const [empCamActive, setEmpCamActive] = useState(false);
  // Face-scan specific state
  const [empScanPhase, setEmpScanPhase] = useState("idle"); // idle | scanning | detected | captured | retake
  const [empFaceImg, setEmpFaceImg] = useState(null);       // base64 captured photo
  const [empScanMsg, setEmpScanMsg] = useState("");
  const [empScanCountdown, setEmpScanCountdown] = useState(0);
  const empCountdownRef = useRef(null);
  const [empVoter, setEmpVoter] = useState({
    name: "", dob: "", gender: "Male", address: "", city: "",
    voterId: "", aadhaar: "", otp: "", phone: "", blind: "no",
    constituency: "Guntur", area: "Central",
  });
  const updateEmpVoter = (k, v) => setEmpVoter(old => ({ ...old, [k]: v }));

  useEffect(() => {
    if (empCamActive && empVideoRef.current && empStreamRef.current) {
      empVideoRef.current.srcObject = empStreamRef.current;
      empVideoRef.current.play().catch(() => setEmpRegMsg("Camera blocked. Click the page and try again."));
    }
  }, [empCamActive]);

  async function startEmpCamera() {
    setEmpRegMsg("");
    setEmpScanPhase("idle");
    setEmpFaceImg(null);
    setEmpScanMsg("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setEmpRegMsg("Camera unavailable. Open on localhost/HTTPS and allow permission."); return;
    }
    try {
      if (empStreamRef.current) empStreamRef.current.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, audio: false });
      empStreamRef.current = stream;
      setEmpCamActive(true);
      setEmpFaceVerified(false);
      // Auto-start scanning after 600ms
      setTimeout(() => { setEmpScanPhase("scanning"); setEmpScanMsg("Scanning… ask the voter to look directly at the camera."); }, 600);
    } catch { setEmpRegMsg("Could not open camera. Allow camera permission."); }
  }

  function stopEmpCamera() {
    if (empCountdownRef.current) clearInterval(empCountdownRef.current);
    if (empStreamRef.current) { empStreamRef.current.getTracks().forEach(t => t.stop()); empStreamRef.current = null; }
    setEmpCamActive(false);
  }

  function empDetectAndCapture() {
    // Capture a camera frame. InsightFace performs actual face detection on the backend.
    setEmpScanPhase("detected");
    setEmpScanMsg("Photo ready. Hold still — capturing in 3…");
    setEmpScanCountdown(3);
    let count = 3;
    if (empCountdownRef.current) clearInterval(empCountdownRef.current);
    empCountdownRef.current = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setEmpScanCountdown(count);
        setEmpScanMsg(`Capturing photo in ${count}…`);
      } else {
        clearInterval(empCountdownRef.current);
        empCountdownRef.current = null;
        // Capture frame from video
        const video = empVideoRef.current;
        const canvas = empCanvasRef.current;
        if (video && canvas) {
          canvas.width = video.videoWidth || 320;
          canvas.height = video.videoHeight || 240;
          const ctx = canvas.getContext("2d");
          ctx.save();
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          ctx.restore();
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setEmpFaceImg(dataUrl);
        }
        setEmpScanPhase("captured");
        setEmpScanMsg("✓ Face photo captured. Backend AI check is pending.");
        stopEmpCamera();
      }
    }, 1000);
  }

  function empConfirmFace() {
    if (!empFaceImg) {
      setEmpRegMsg("Capture a face photo before confirming.");
      return;
    }
    // Photo confirmation only; actual AI processing happens on the backend.
    setEmpFaceVerified(true);
    setEmpRegMsg("Photo confirmed. AI face detection will run when you complete registration.");
  }

  function empRetakeFace() {
    setEmpFaceImg(null);
    setEmpFaceVerified(false);
    setEmpScanPhase("idle");
    setEmpScanMsg("");
    setEmpScanCountdown(0);
    startEmpCamera();
  }

  function resetEmpReg() {
    setEmpRegPanel(false); setEmpRegStep(0); setEmpRegMsg(""); setEmpRegSuccess(false);
    setEmpOtpSent(false); setEmpOtpVerified(false); setEmpFaceVerified(false);
    setEmpFpVerified(false); setEmpCertFile(null); setEmpCamActive(false);
    setEmpScanPhase("idle"); setEmpFaceImg(null); setEmpScanMsg(""); setEmpScanCountdown(0);
    if (empCountdownRef.current) clearInterval(empCountdownRef.current);
    if (empStreamRef.current) { empStreamRef.current.getTracks().forEach(t => t.stop()); empStreamRef.current = null; }
    setEmpVoter({ name: "", dob: "", gender: "Male", address: "", city: "", voterId: "", aadhaar: "", otp: "", phone: "", blind: "no", constituency: "Guntur", area: "Central" });
  }

  function empNextToStep1() {
    setEmpRegMsg("");
    if (!empVoter.name.trim()) { setEmpRegMsg("Enter the voter's full name."); return; }
    if (!empVoter.dob) { setEmpRegMsg("Enter the voter's date of birth."); return; }
    if (!empVoter.address.trim() || !empVoter.city.trim()) { setEmpRegMsg("Enter address and city."); return; }
    if (!/^\d{12}$/.test(empVoter.aadhaar)) { setEmpRegMsg("Enter a 12-digit demo Aadhaar number."); return; }
    if (!empOtpVerified) { setEmpRegMsg("Request and verify the demo OTP before continuing."); return; }
    setEmpRegStep(1);
  }

  async function empCompleteRegistration() {
    setEmpRegMsg("");
    if (empVoter.blind !== "yes" && (!empFaceVerified || !empFaceImg)) {
      setEmpRegMsg("Capture and confirm the voter's face photo first."); return;
    }
    if (empVoter.blind === "yes" && !empCertFile) {
      setEmpRegMsg("Upload the disability certificate."); return;
    }
    if (!empFpVerified) {
      setEmpRegMsg("Complete the fingerprint demo step."); return;
    }
    const voterNumber = empVoter.voterId.trim() || empVoter.aadhaar.trim();
    if (!voterNumber) {
      setEmpRegMsg("Enter a voter ID (or a demo Aadhaar value) to create a unique voter record."); return;
    }
    try {
      setEmpRegMsg("Registering voter and processing face image with AI…");
      const payload = new FormData();
      payload.append("name", empVoter.name.trim());
      payload.append("voter_number", voterNumber);
      payload.append("dob", empVoter.dob);
      if (empVoter.blind !== "yes") {
        const imageBlob = await (await fetch(empFaceImg)).blob();
        payload.append("file", imageBlob, "voter-face.jpg");
      }
      const response = await api.post("/employee/register-voter", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const result = response.data;
      const existingVoters = JSON.parse(localStorage.getItem("emp_registered_voters") || "[]");
      existingVoters.push({
        id: String(result.voter_number), backendId: result.voter_id,
        name: empVoter.name.trim(), dob: empVoter.dob, gender: empVoter.gender,
        address: empVoter.address.trim(), city: empVoter.city.trim(), voterId: voterNumber,
        phone: empVoter.phone.trim(), blind: empVoter.blind === "yes",
        faceRegistered: result.face_registered, constituency: empVoter.constituency,
        area: empVoter.area, registeredBy: form.employeeId || "Employee",
        registeredAt: new Date().toLocaleString(),
      });
      localStorage.setItem("emp_registered_voters", JSON.stringify(existingVoters));
      setEmpRegSuccess(true);
      setEmpRegStep(2);
      setEmpRegMsg("");
    } catch (error) {
      const detail = error.response?.data?.detail || error.message || "Registration failed.";
      setEmpRegMsg(typeof detail === "string" ? detail : "Registration failed. Check the backend logs.");
    }
  }

  const update = (key, value) => setForm((old) => ({ ...old, [key]: value }));

  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {
        setMessage("Camera opened, but preview playback was blocked. Click the page and try again.");
      });
    }
  }, [cameraActive]);

  useEffect(() => () => {
    if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
  }, []);
  async function startFaceCamera() {
    setMessage("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("Camera access is unavailable. Open this app on localhost or HTTPS and allow camera permission.");
      return;
    }
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      setCameraActive(true);
      setFaceDemoVerified(false);
      setLiveChallenge(["Look directly at the camera, then slowly turn your head left and back to center.", "Look at the camera, blink naturally twice, then look slightly to your right.", "Turn your head right, return to center, and keep your face inside the frame."][Math.floor(Math.random() * 3)]);
    } catch {
      setMessage("Could not open the camera. Allow camera permission in your browser and try again.");
    }
  }

  function finishLiveDemo() {
    if (!videoRef.current || !cameraActive || videoRef.current.readyState < 2) {
      setMessage("Start the live camera and wait until your face is visible before continuing.");
      return;
    }
    // Live camera access and a user-confirmed randomized movement are demo checks only.
    setFaceDemoVerified(true);
    if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
    setMessage("Live camera demo completed. This prototype does not run AI face matching or automatically verify the liveness challenge.");
  }
  const selectedRole = roles.find((item) => item.id === role);

  function startOtp() {
    if (!/^\d{12}$/.test(form.aadhaar)) { setMessage("Enter a 12-digit demo Aadhaar number."); return; }
    setOtpSent(true);
    setMessage("Prototype only: demo OTP is 123456. No Aadhaar request or SMS was sent.");
  }
  function verifyOtp() {
    if (form.otp !== "123456") { setMessage("For the prototype, enter demo OTP 123456."); return; }
    setIdentityVerified(true);
    setMessage("Mock identity check complete. This is not UIDAI authentication.");
  }
  function register() {
    if (!form.name.trim()) { setMessage("Please enter your full name."); return; }
    if (role === "user" && !form.email.trim()) { setMessage("Please enter your email address so you can log in later."); return; }
    if (role === "user" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { setMessage("Enter a valid email address."); return; }
    if (role === "user" && !/^\+?[0-9\s()-]{8,16}$/.test(form.phone.trim())) { setMessage("Enter a valid mobile number (8–16 digits, with optional +, spaces or dashes)."); return; }
    if (role === "user" && (!form.dob || !form.address.trim() || !form.city.trim())) {
      setMessage("Please complete date of birth, address, and city."); return;
    }
    if (role === "user" && !identityVerified) { setMessage("Request and verify the demo OTP before continuing."); return; }
    if (role === "user" && form.blind === "yes" && !certificateFile) { setMessage("Upload or capture the disability certificate to continue in this demo workflow."); return; }
    if (role === "user" && form.blind !== "yes" && !faceDemoVerified) { setMessage("Complete the live camera demo step first."); return; }
    if (role === "user" && !fingerprintDemoVerified) { setMessage("Complete the fingerprint demo step first."); return; }
    if (role === "candidate" && (!form.name.trim() || !form.nomination.trim() || !form.constituency || !identityVerified || !form.password)) {
      setMessage("Candidate name, nomination number, password, constituency, and mock identity verification are required."); return;
    }
    if (role === "candidate" && (!form.name.trim() || !form.nomination.trim() || !form.constituency || !identityVerified || !form.password)) {
      setMessage("Candidate name, nomination number, password, constituency, and mock identity verification are required."); return;
    }
    if (role === "employee" && (!form.name.trim() || !form.employeeId.trim() || !form.password)) {
      setMessage("Enter name, government-issued employee ID, and password."); return;
    }
    if (form.password && form.password.length < 8) { setMessage("Password must be at least 8 characters."); return; }
    if ((role === "user" || role === "candidate" || role === "employee") && form.password !== form.confirmPassword) { setMessage("Passwords do not match."); return; }
    if (role === "employee") {
      const employees = JSON.parse(localStorage.getItem("registered_employees") || "[]");
      const alreadyExists = employees.some((e) => e.employeeId.toLowerCase() === form.employeeId.trim().toLowerCase());
      if (alreadyExists) {
        setMessage("⚠️ This Employee ID is already registered. Please login instead.");
        return;
      }
      employees.push({ name: form.name.trim(), employeeId: form.employeeId.trim(), password: form.password });
      localStorage.setItem("registered_employees", JSON.stringify(employees));
      setMessage("✅ Employee registered successfully! You can now login with your Employee ID and password.");
      setLoggedIn(true);
      return;
    }
    setMessage("Registration demo completed. No real Aadhaar details or biometrics were sent to a government service.");
    setLoggedIn(true);
  }
  function login() {
    if (role === "employee") {
      if (!form.email.trim() || !form.password.trim()) { setMessage("Enter your government employee ID and password."); return; }
      const employees = JSON.parse(localStorage.getItem("registered_employees") || "[]");
      const match = employees.find((e) => e.employeeId.toLowerCase() === form.email.trim().toLowerCase());
      if (!match) { setMessage("❌ No employee found with this ID. Please register first."); return; }
      if (match.password !== form.password) { setMessage("❌ Incorrect password. Please try again."); return; }
      setLoggedIn(true); setMessage("");
      return;
    }
    if (!form.email.trim() || !form.password.trim()) { setMessage("Enter your login ID/email and password."); return; }
    setLoggedIn(true); setMessage("");
  }
  function logout() { setLoggedIn(false); setMode("login"); setMessage(""); setVoteConfirmed(false); setSelectedVoter(null); }

  const empRegisteredVoters = JSON.parse(localStorage.getItem("emp_registered_voters") || "[]");
  const voters = [
    { id: "DEMO-1001", name: "Demo Voter One", blind: false },
    { id: "DEMO-1002", name: "Demo Voter Two", blind: true },
    { id: "DEMO-1003", name: "Demo Voter Three", blind: false },
    ...empRegisteredVoters,
  ].filter((v) => `${v.name} ${v.id}`.toLowerCase().includes(query.toLowerCase()));

  return <div style={shell}>
    <header style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "17px clamp(18px,5vw,64px)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: "#155eef", color: "#fff", display: "grid", placeItems: "center", fontSize: 23 }}>✓</div>
        <div><strong style={{ fontSize: 18 }}>CivicVote</strong><div style={{ fontSize: 12, color: "#64748b" }}>Digital Voting Prototype</div></div>
      </div>
      {loggedIn && <button style={{ ...button, background: "#eef4ff", color: "#155eef" }} onClick={logout}>Log out</button>}
    </header>

    {!loggedIn ? <main style={{ maxWidth: 1120, margin: "0 auto", padding: "clamp(24px,5vw,60px) 20px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 32, alignItems: "start" }}>
      <section style={{ paddingTop: 12 }}>
        <div style={{ color: "#155eef", fontWeight: 800, letterSpacing: 1.5, fontSize: 12 }}>ACCESSIBLE • TRANSPARENT • SECURE BY DESIGN</div>
        <h1 style={{ fontSize: "clamp(34px,5vw,54px)", lineHeight: 1.08, margin: "16px 0", letterSpacing: -1.5 }}>Election information, designed around people.</h1>
        <p style={{ fontSize: 17, lineHeight: 1.7, color: "#53647b", maxWidth: 530 }}>Register from your own device, explore constituency information, or access the polling-employee workflow with the correct authorization.</p>
        <div style={{ display: "grid", gap: 12, marginTop: 28 }}>
          {roles.map((r) => <button key={r.id} onClick={() => { setRole(r.id); setMessage(""); setOtpSent(false); setIdentityVerified(false); setFaceDemoVerified(false); setFingerprintDemoVerified(false); setFaceCapture(null); setCameraActive(false); if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop()); streamRef.current = null; setCertificateFile(null); setForm((old) => ({ ...old, otp: "", aadhaar: "" })); }} style={{ textAlign: "left", padding: 16, display: "flex", gap: 14, alignItems: "center", background: role === r.id ? "#eef4ff" : "#fff", border: role === r.id ? "2px solid #155eef" : "1px solid #dce4ee", borderRadius: 14, cursor: "pointer", color: "#17263c" }}>
            <span style={{ fontSize: 26 }}>{r.icon}</span><span style={{ flex: 1 }}><strong>{r.label}</strong><span style={{ display: "block", fontSize: 13, color: "#64748b", marginTop: 4 }}>{r.desc}</span></span>{role === r.id && <span aria-label="selected" style={{ color: "#155eef" }}>●</span>}
          </button>)}
        </div>
      </section>

      <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 22, padding: "clamp(22px,4vw,34px)", boxShadow: "0 18px 50px #17345b0d" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {["login", "register"].map((m) => <button key={m} onClick={() => { setMode(m); setMessage(""); setOtpSent(false); setIdentityVerified(false); setFaceDemoVerified(false); setFingerprintDemoVerified(false); setFaceCapture(null); setCameraActive(false); if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop()); streamRef.current = null; setCertificateFile(null); setForm((old) => ({ ...old, otp: "", aadhaar: "" })); }} style={{ ...button, flex: 1, background: mode === m ? "#155eef" : "#f0f4f9", color: mode === m ? "#fff" : "#34445a" }}>{m === "login" ? "Login" : "Register"}</button>)}
        </div>
        <h2 style={{ margin: "0 0 6px", fontSize: 25 }}>{mode === "login" ? `${selectedRole.label} login` : `${selectedRole.label} registration`}</h2>
        <p style={{ color: "#64748b", marginTop: 0, lineHeight: 1.5, fontSize: 14 }}>{selectedRole.desc}</p>
        <form noValidate onSubmit={(e) => { e.preventDefault(); setMessage(""); mode === "login" ? login() : register(); }} style={{ display: "grid", gap: 13 }}>
          {mode === "register" && <label>Full name<input aria-label="Full name" style={input} value={form.name} onChange={(e) => update("name", e.target.value)} required /></label>}
          {mode === "register" && role === "user" && <>
            <label>Date of birth<input style={input} type="date" value={form.dob} onChange={(e) => update("dob", e.target.value)} required /></label>
            <label>Address<input style={input} value={form.address} onChange={(e) => update("address", e.target.value)} required /></label>
            <label>City<input style={input} value={form.city} onChange={(e) => update("city", e.target.value)} required /></label>
            <label>Voter ID (if already issued)<input style={input} value={form.voterId} onChange={(e) => update("voterId", e.target.value)} /></label>
          </>}
          {role === "user" && mode === "register" && <>
            <label>Mobile number<input style={input} inputMode="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} required /></label>
            <label>Demo Aadhaar number (synthetic only)<input style={input} inputMode="numeric" maxLength={12} value={form.aadhaar} onChange={(e) => update("aadhaar", e.target.value.replace(/\D/g, ""))} required /></label>
            <button type="button" style={{ ...button, background: "#eaf1ff", color: "#155eef" }} onClick={startOtp}>Request demo OTP</button>
            {otpSent && <label>Demo OTP<input style={input} inputMode="numeric" maxLength={6} value={form.otp} onChange={(e) => update("otp", e.target.value)} placeholder="123456" /></label>}
            {otpSent && <button type="button" style={{ ...button, background: "#0e8a62" }} onClick={verifyOtp}>Verify demo OTP</button>}
            {identityVerified && <p style={{ color: "#08784f", margin: 0 }}>✓ Mock identity check passed</p>}
            <label>Person with blindness?<select style={input} value={form.blind} onChange={(e) => { update("blind", e.target.value); setFaceDemoVerified(false); setFingerprintDemoVerified(false); setFaceCapture(null); if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop()); streamRef.current = null; setCameraActive(false); }}><option value="no">No</option><option value="yes">Yes</option></select></label>
            {form.blind === "yes" && <label>Disability certificate — capture or upload<input style={input} type="file" accept="image/*,.pdf" capture="environment" onChange={(e) => setCertificateFile(e.target.files?.[0] || null)} required />{certificateFile && <small>Selected: {certificateFile.name}</small>}</label>}
            {form.blind !== "yes" && <section style={{ border: "1px solid #ccd6e3", borderRadius: 10, padding: 12, display: "grid", gap: 10 }}>
              <strong>Step 1 — Live face camera check</strong>
              <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Select Start, allow camera permission, and wait for your live preview to appear. Follow the movement prompt, then choose the continue button. This demo does not perform AI face matching or automatically verify liveness.</p>
              <button type="button" style={button} onClick={startFaceCamera}>{cameraActive ? "Restart live camera" : "Start live face verification"}</button>
              {cameraActive && <>
                <video ref={videoRef} autoPlay playsInline muted aria-label="Live face camera preview" style={{ width: "100%", maxHeight: 280, objectFit: "cover", background: "#0f172a", borderRadius: 10, transform: "scaleX(-1)" }} />
                <div role="status" style={{ background: "#eef4ff", padding: 12, borderRadius: 8, color: "#173b80" }}><strong>Live challenge:</strong> {liveChallenge}</div>
                <button type="button" style={{ ...button, background: "#0e8a62" }} onClick={finishLiveDemo}>I completed the movement — continue demo</button>
              </>}
              {faceDemoVerified && <small style={{ color: "#08784f" }}>✓ Live camera step completed (demo only)</small>}
            </section>}
            <section style={{ border: "1px solid #ccd6e3", borderRadius: 10, padding: 12, display: "grid", gap: 10 }}>
              <strong>{form.blind === "yes" ? "Fingerprint verification (demo)" : "Step 2 — Fingerprint verification (demo)"}</strong>
              <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>No fingerprint sensor is connected in this prototype. Use this demo control only to test navigation; it does not scan or match a fingerprint.</p>
              <button type="button" style={{ ...button, background: fingerprintDemoVerified ? "#0e8a62" : "#eaf1ff", color: fingerprintDemoVerified ? "#fff" : "#155eef" }} onClick={() => { setFingerprintDemoVerified(true); setMessage("Demo fingerprint step marked complete. No fingerprint was read or verified."); }}>{fingerprintDemoVerified ? "Fingerprint demo step complete" : "Complete fingerprint demo step"}</button>
            </section>
            <label>Email address<input style={input} type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required /></label>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Demo only: live camera interaction does not perform AI face matching or automatic liveness detection; fingerprint step does not read a sensor. Real Aadhaar, liveness and fingerprint services are not connected.</p>
          </>}
          {role === "candidate" && mode === "register" && <>
            <label>Email address<input style={input} type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required /></label>
            <label>Constituency<select style={input} value={form.constituency} onChange={(e) => update("constituency", e.target.value)}><option>Guntur</option><option>Vijayawada</option><option>Tenali</option><option>Mangalagiri</option></select></label>
            <label>Nomination number<input style={input} value={form.nomination} onChange={(e) => update("nomination", e.target.value)} required /></label>
            <label>Demo Aadhaar number (synthetic only)<input style={input} maxLength={12} inputMode="numeric" value={form.aadhaar} onChange={(e) => update("aadhaar", e.target.value.replace(/\D/g, ""))} required /></label>
            <button type="button" style={{ ...button, background: "#eaf1ff", color: "#155eef" }} onClick={startOtp}>Request demo OTP</button>
            {otpSent && <label>Demo OTP<input style={input} maxLength={6} value={form.otp} onChange={(e) => update("otp", e.target.value)} /></label>}
            {otpSent && <button type="button" style={{ ...button, background: "#0e8a62" }} onClick={verifyOtp}>Verify demo OTP</button>}
          </>}
          {role === "employee" && mode === "register" && <label>Government-issued employee ID<input style={input} value={form.employeeId} onChange={(e) => update("employeeId", e.target.value)} required /></label>}
          {mode === "login" && <label>{role === "employee" ? "Government employee ID" : "Email or registered ID"}<input style={input} value={form.email} onChange={(e) => update("email", e.target.value)} required /></label>}
          {(mode === "login" || mode === "register") && <label>Password<input style={input} type="password" minLength={8} value={form.password} onChange={(e) => update("password", e.target.value)} required /></label>}
          {mode === "register" && <label>Confirm password<input style={input} type="password" minLength={8} value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} required /></label>}
          <button type="submit" style={{ ...button, marginTop: 5 }}>{mode === "login" ? "Continue to dashboard" : "Complete registration"}</button>
        </form>
        {message && <div role="status" aria-live="polite" style={{ marginTop: 16, padding: 12, background: "#fff7e6", color: "#7a4b00", borderRadius: 10, lineHeight: 1.5, fontSize: 13 }}>{message}</div>}
        <p style={{ fontSize: 12, lineHeight: 1.6, color: "#64748b", marginBottom: 0 }}>Prototype only. No real Aadhaar OTP is sent and no government identity service is connected. Do not enter real Aadhaar details.</p>
      </section>
    </main> : <main style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ marginBottom: 26 }}><div style={{ color: "#155eef", fontWeight: 800, fontSize: 12, letterSpacing: 1.2 }}>DASHBOARD</div><h1 style={{ margin: "8px 0" }}>Welcome{form.name ? `, ${form.name}` : ""}</h1><p style={{ color: "#64748b" }}>{selectedRole.label} · Prototype data</p></div>
      {role === "user" && <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))" }}>
        <section style={{ background: "#fff", padding: 22, border: "1px solid #e2e8f0", borderRadius: 16 }}>
          <h2>Constituency information</h2><label>Choose constituency<select style={input} value={form.constituency} onChange={(e) => update("constituency", e.target.value)}><option>Guntur</option><option>Vijayawada</option><option>Tenali</option><option>Mangalagiri</option></select></label>
          <p><strong>Previous candidate:</strong> Demo Candidate A</p><p><strong>Polling booths:</strong> Demo information — verify with official sources</p><p><strong>Election status:</strong> Information only</p>
          <p style={{ color: "#64748b", fontSize: 13 }}>This dashboard does not allow online voting.</p>
        </section>
        <section style={{ background: "#fff", padding: 22, border: "1px solid #e2e8f0", borderRadius: 16 }}><h2>Published results</h2><p>Results will appear here only after authorized publication.</p><p style={{ color: "#64748b", fontSize: 13 }}>Demo placeholder — no live votes or unofficial counts shown.</p></section>
      </div>}
      {role === "candidate" && <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))" }}>
        <section style={{ background: "#fff", padding: 22, border: "1px solid #e2e8f0", borderRadius: 16 }}><h2>Constituency overview</h2><label>Choose constituency<select style={input} value={form.constituency} onChange={(e) => update("constituency", e.target.value)}><option>Guntur</option><option>Vijayawada</option><option>Tenali</option><option>Mangalagiri</option></select></label><p><strong>Mandals:</strong> Demo count unavailable</p><p><strong>Eligible voters:</strong> Not connected to official data</p><p><strong>Previous candidates:</strong> Demo data only</p></section>
        <section style={{ background: "#fff", padding: 22, border: "1px solid #e2e8f0", borderRadius: 16 }}><h2>Published results</h2><p>Only results officially released for the selected constituency should appear here.</p><p style={{ color: "#64748b", fontSize: 13 }}>No individual voter details are displayed.</p></section>
      </div>}
      {role === "employee" && <section style={{ background: "#fff", padding: 22, border: "1px solid #e2e8f0", borderRadius: 16 }}>
        <h2>Polling employee workspace</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginTop: 16 }}>
          <label>Constituency<select style={input} value={form.constituency} onChange={(e) => update("constituency", e.target.value)}><option>Guntur</option><option>Vijayawada</option><option>Tenali</option></select></label>
          <label>Area / Mandal<select style={input} value={form.area} onChange={(e) => update("area", e.target.value)}><option>Central</option><option>North</option><option>South</option></select></label>
        </div>

        {/* ── Register New Voter (Assisted) Button ── */}
        <div style={{ marginTop: 20, padding: "14px 18px", background: "#f0f9ff", border: "1.5px dashed #155eef", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <strong style={{ color: "#155eef", fontSize: 15 }}>🧾 Register a New Voter (Assisted)</strong>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#53647b" }}>For illiterate or first-time voters who need employee assistance to register.</p>
          </div>
          <button style={{ ...button, background: empRegPanel ? "#e2edff" : "#155eef", color: empRegPanel ? "#155eef" : "#fff", fontSize: 14 }} onClick={() => { if (empRegPanel) resetEmpReg(); else setEmpRegPanel(true); }}>{empRegPanel ? "✕ Cancel" : "+ Register New Voter"}</button>
        </div>

        {/* ── Assisted Registration Panel ── */}
        {empRegPanel && <div style={{ marginTop: 18, border: "1px solid #ccd6e3", borderRadius: 14, overflow: "hidden" }}>
          {/* Step tabs */}
          <div style={{ display: "flex", background: "#f4f7fb", borderBottom: "1px solid #ccd6e3" }}>
            {["1. Personal Details", "2. Biometric Demo", "3. Done"].map((lbl, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center", padding: "11px 6px", fontWeight: 700, fontSize: 13, color: empRegStep === i ? "#155eef" : "#64748b", borderBottom: empRegStep === i ? "3px solid #155eef" : "3px solid transparent", cursor: "default" }}>{lbl}</div>
            ))}
          </div>

          <div style={{ padding: "22px 20px" }}>
            {/* ── Step 0: Personal Details ── */}
            {empRegStep === 0 && <div style={{ display: "grid", gap: 13 }}>
              <p style={{ margin: 0, color: "#53647b", fontSize: 13, lineHeight: 1.6 }}>Fill in the voter's details on their behalf. All fields marked * are required.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
                <label style={{ fontWeight: 600, fontSize: 14 }}>Full Name *<input style={input} value={empVoter.name} onChange={e => updateEmpVoter("name", e.target.value)} placeholder="Voter's full name" /></label>
                <label style={{ fontWeight: 600, fontSize: 14 }}>Date of Birth *<input style={input} type="date" value={empVoter.dob} onChange={e => updateEmpVoter("dob", e.target.value)} /></label>
                <label style={{ fontWeight: 600, fontSize: 14 }}>Gender<select style={input} value={empVoter.gender} onChange={e => updateEmpVoter("gender", e.target.value)}><option>Male</option><option>Female</option><option>Other</option></select></label>
                <label style={{ fontWeight: 600, fontSize: 14 }}>Mobile Number<input style={input} inputMode="tel" value={empVoter.phone} onChange={e => updateEmpVoter("phone", e.target.value)} placeholder="10-digit mobile" /></label>
              </div>
              <label style={{ fontWeight: 600, fontSize: 14 }}>Address *<input style={input} value={empVoter.address} onChange={e => updateEmpVoter("address", e.target.value)} placeholder="House no., Street, Village" /></label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
                <label style={{ fontWeight: 600, fontSize: 14 }}>City / Town *<input style={input} value={empVoter.city} onChange={e => updateEmpVoter("city", e.target.value)} placeholder="City or town" /></label>
                <label style={{ fontWeight: 600, fontSize: 14 }}>Voter ID (if issued)<input style={input} value={empVoter.voterId} onChange={e => updateEmpVoter("voterId", e.target.value)} placeholder="Leave blank if new" /></label>
                <label style={{ fontWeight: 600, fontSize: 14 }}>Constituency<select style={input} value={empVoter.constituency} onChange={e => updateEmpVoter("constituency", e.target.value)}><option>Guntur</option><option>Vijayawada</option><option>Tenali</option><option>Mangalagiri</option></select></label>
                <label style={{ fontWeight: 600, fontSize: 14 }}>Area / Mandal<select style={input} value={empVoter.area} onChange={e => updateEmpVoter("area", e.target.value)}><option>Central</option><option>North</option><option>South</option></select></label>
              </div>
              <label style={{ fontWeight: 600, fontSize: 14 }}>Person with Disability (Blindness)?<select style={input} value={empVoter.blind} onChange={e => { updateEmpVoter("blind", e.target.value); setEmpFaceVerified(false); setEmpFpVerified(false); setEmpCertFile(null); if (empStreamRef.current) { empStreamRef.current.getTracks().forEach(t => t.stop()); empStreamRef.current = null; } setEmpCamActive(false); }}><option value="no">No</option><option value="yes">Yes (Blind / Disability)</option></select></label>

              {/* Aadhaar OTP */}
              <div style={{ border: "1px solid #ccd6e3", borderRadius: 10, padding: 14, background: "#f8fafd" }}>
                <strong style={{ fontSize: 14 }}>Aadhaar Verification (Demo)</strong>
                <p style={{ margin: "6px 0 10px", fontSize: 13, color: "#64748b" }}>Enter the 12-digit demo Aadhaar number and verify with OTP 123456.</p>
                <label style={{ fontWeight: 600, fontSize: 14 }}>Demo Aadhaar Number *<input style={input} inputMode="numeric" maxLength={12} value={empVoter.aadhaar} onChange={e => updateEmpVoter("aadhaar", e.target.value.replace(/\D/g, ""))} placeholder="12-digit number" /></label>
                {!empOtpVerified && <button type="button" style={{ ...button, marginTop: 10, background: "#eaf1ff", color: "#155eef", width: "auto", padding: "10px 20px" }} onClick={() => { if (!/^\d{12}$/.test(empVoter.aadhaar)) { setEmpRegMsg("Enter a 12-digit demo Aadhaar."); return; } setEmpOtpSent(true); setEmpRegMsg("Demo OTP sent: use 123456. No real Aadhaar or SMS was used."); }}>Request Demo OTP</button>}
                {empOtpSent && !empOtpVerified && <><label style={{ fontWeight: 600, fontSize: 14, marginTop: 10, display: "block" }}>Enter Demo OTP<input style={input} inputMode="numeric" maxLength={6} value={empVoter.otp} onChange={e => updateEmpVoter("otp", e.target.value)} placeholder="123456" /></label><button type="button" style={{ ...button, background: "#0e8a62", marginTop: 8, width: "auto", padding: "10px 20px" }} onClick={() => { if (empVoter.otp !== "123456") { setEmpRegMsg("Prototype: enter OTP 123456."); return; } setEmpOtpVerified(true); setEmpRegMsg("Mock Aadhaar check passed. (Not real UIDAI.)"); }}>Verify Demo OTP</button></>}
                {empOtpVerified && <p style={{ color: "#08784f", marginTop: 8, fontWeight: 600 }}>✓ Mock identity check passed</p>}
              </div>

              {empRegMsg && <div role="status" style={{ padding: 10, background: "#fff7e6", color: "#7a4b00", borderRadius: 9, fontSize: 13 }}>{empRegMsg}</div>}
              <button type="button" style={{ ...button, marginTop: 4 }} onClick={empNextToStep1}>Continue to Biometric Demo →</button>
            </div>}

            {/* ── Step 1: Biometric Demo ── */}
            {empRegStep === 1 && <div style={{ display: "grid", gap: 14 }}>
              <p style={{ margin: 0, color: "#53647b", fontSize: 13 }}>Complete the biometric demo steps on the voter's behalf.</p>

              {empVoter.blind === "yes" && <div style={{ border: "1px solid #ccd6e3", borderRadius: 10, padding: 14 }}>
                <strong>Disability Certificate Upload</strong>
                <p style={{ margin: "6px 0 10px", fontSize: 13, color: "#64748b" }}>Upload or capture the voter's disability certificate.</p>
                <input type="file" accept="image/*,.pdf" capture="environment" style={input} onChange={e => setEmpCertFile(e.target.files?.[0] || null)} />
                {empCertFile && <small style={{ color: "#08784f" }}>✓ Selected: {empCertFile.name}</small>}
              </div>}

              {empVoter.blind !== "yes" && <div style={{ border: `2px solid ${empFaceVerified ? "#0e8a62" : empScanPhase === "detected" ? "#f59e0b" : empCamActive ? "#155eef" : "#ccd6e3"}`, borderRadius: 14, padding: 16, display: "grid", gap: 12, background: empFaceVerified ? "#f0faf5" : "#fff", transition: "border-color 0.4s" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <strong style={{ fontSize: 15 }}>👁 Step 1 — Face Recognition Scan</strong>
                  {empFaceVerified && <span style={{ background: "#0e8a62", color: "#fff", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>✓ VERIFIED</span>}
                  {empCamActive && !empFaceVerified && <span style={{ background: "#155eef", color: "#fff", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700, animation: "pulse 1.2s infinite" }}>● LIVE</span>}
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "#53647b", lineHeight: 1.6 }}>Position one voter's face in the frame. InsightFace will check the uploaded photo and create a face embedding on the backend during registration.</p>

                {/* Camera / captured photo area */}
                {!empFaceImg && (
                  <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", background: "#0f172a", minHeight: empCamActive ? 0 : 0 }}>
                    {empCamActive && (
                      <>
                        <video ref={empVideoRef} autoPlay playsInline muted
                          style={{ width: "100%", maxHeight: 260, objectFit: "cover", display: "block", transform: "scaleX(-1)" }} />
                        {/* Scan overlay */}
                        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                          {/* Face oval guide */}
                          <div style={{
                            position: "absolute", top: "50%", left: "50%",
                            transform: "translate(-50%,-54%)",
                            width: 150, height: 190,
                            border: `3px solid ${empScanPhase === "detected" ? "#f59e0b" : "rgba(99,179,237,0.85)"}`,
                            borderRadius: "50%",
                            boxShadow: empScanPhase === "detected" ? "0 0 0 4px rgba(245,158,11,0.25)" : "0 0 0 4px rgba(21,94,239,0.18)",
                            transition: "border-color 0.3s, box-shadow 0.3s"
                          }} />
                          {/* Animated scan line */}
                          {empScanPhase === "scanning" && (
                            <div style={{
                              position: "absolute", top: "12%", left: "25%", right: "25%",
                              height: 2,
                              background: "linear-gradient(90deg, transparent, #63b3ed, transparent)",
                              animation: "scanLine 1.8s ease-in-out infinite"
                            }} />
                          )}
                          {/* Corner brackets */}
                          {[{ top: "8%", left: "18%", borderTop: "3px solid #63b3ed", borderLeft: "3px solid #63b3ed" },
                            { top: "8%", right: "18%", borderTop: "3px solid #63b3ed", borderRight: "3px solid #63b3ed" },
                            { bottom: "8%", left: "18%", borderBottom: "3px solid #63b3ed", borderLeft: "3px solid #63b3ed" },
                            { bottom: "8%", right: "18%", borderBottom: "3px solid #63b3ed", borderRight: "3px solid #63b3ed" }
                          ].map((s, i) => <div key={i} style={{ position: "absolute", width: 22, height: 22, ...s }} />)}
                          {/* Status badge */}
                          {empScanMsg && (
                            <div style={{
                              position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)",
                              background: empScanPhase === "detected" ? "rgba(245,158,11,0.92)" : "rgba(15,23,42,0.82)",
                              color: "#fff", padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                              whiteSpace: "nowrap", backdropFilter: "blur(4px)"
                            }}>{empScanMsg}</div>
                          )}
                          {/* Countdown ring */}
                          {empScanPhase === "detected" && empScanCountdown > 0 && (
                            <div style={{
                              position: "absolute", top: "50%", left: "50%", transform: "translate(-54%, -54%)",
                              width: 58, height: 58, borderRadius: "50%",
                              border: "4px solid #f59e0b",
                              display: "grid", placeItems: "center",
                              fontSize: 24, fontWeight: 800, color: "#f59e0b",
                              background: "rgba(15,23,42,0.55)"
                            }}>{empScanCountdown}</div>
                          )}
                        </div>
                      </>
                    )}
                    <canvas ref={empCanvasRef} style={{ display: "none" }} />
                  </div>
                )}

                {/* Captured photo preview */}
                {empFaceImg && (
                  <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "3px solid #0e8a62" }}>
                    <img src={empFaceImg} alt="Captured voter face" style={{ width: "100%", maxHeight: 240, objectFit: "cover", display: "block" }} />
                    <div style={{ position: "absolute", top: 10, left: 10, background: "#0e8a62", color: "#fff", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700 }}>✓ Photo Captured</div>
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {!empCamActive && !empFaceImg && (
                    <button type="button" style={{ ...button, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={startEmpCamera}>
                      <span>📷</span> Start Face Scan
                    </button>
                  )}
                  {empCamActive && empScanPhase === "scanning" && (
                    <button type="button" style={{ ...button, flex: 1, background: "#f59e0b", color: "#fff" }} onClick={empDetectAndCapture}>
                      📷 Capture Face Photo
                    </button>
                  )}
                  {empCamActive && empScanPhase === "detected" && (
                    <button type="button" style={{ ...button, flex: 1, background: "#64748b", color: "#fff" }} disabled>
                      ⏳ Capturing…
                    </button>
                  )}
                  {empFaceImg && !empFaceVerified && (
                    <>
                      <button type="button" style={{ ...button, flex: 1, background: "#0e8a62" }} onClick={empConfirmFace}>✓ Confirm &amp; Use This Photo</button>
                      <button type="button" style={{ ...button, background: "#f0f4f9", color: "#34445a" }} onClick={empRetakeFace}>↩ Retake</button>
                    </>
                  )}
                  {empFaceVerified && (
                    <button type="button" style={{ ...button, background: "#e2f5ec", color: "#0e8a62", flex: 1, cursor: "default" }} disabled>✓ Photo Confirmed</button>
                  )}
                </div>

                {/* CSS animations injected inline */}
                <style>{`
                  @keyframes scanLine {
                    0% { transform: translateY(0px); opacity: 0.7; }
                    50% { transform: translateY(160px); opacity: 1; }
                    100% { transform: translateY(0px); opacity: 0.7; }
                  }
                  @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                  }
                `}</style>
              </div>}

              <div style={{ border: "1px solid #ccd6e3", borderRadius: 10, padding: 14, display: "grid", gap: 10 }}>
                <strong>{empVoter.blind === "yes" ? "Fingerprint Verification (Demo)" : "Step 2 — Fingerprint Verification (Demo)"}</strong>
                <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>No fingerprint sensor connected. Use this demo control to simulate the step.</p>
                <button type="button" style={{ ...button, background: empFpVerified ? "#0e8a62" : "#eaf1ff", color: empFpVerified ? "#fff" : "#155eef" }} onClick={() => { setEmpFpVerified(true); setEmpRegMsg("Fingerprint demo step marked complete. No fingerprint was read."); }}>{empFpVerified ? "✓ Fingerprint Demo Complete" : "Complete Fingerprint Demo Step"}</button>
              </div>

              {empRegMsg && <div role="status" style={{ padding: 10, background: "#fff7e6", color: "#7a4b00", borderRadius: 9, fontSize: 13 }}>{empRegMsg}</div>}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" style={{ ...button, background: "#f0f4f9", color: "#34445a" }} onClick={() => { setEmpRegStep(0); setEmpRegMsg(""); }}>← Back</button>
                <button type="button" style={{ ...button, flex: 1 }} onClick={empCompleteRegistration}>✅ Complete Registration</button>
              </div>
            </div>}

            {/* ── Step 2: Done ── */}
            {empRegStep === 2 && empRegSuccess && <div style={{ textAlign: "center", padding: "24px 10px" }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
              <h3 style={{ color: "#08784f", margin: "0 0 8px" }}>Voter Registered Successfully!</h3>
              <p style={{ color: "#53647b", lineHeight: 1.7 }}><strong>{empVoter.name}</strong> has been registered by Polling Employee <strong>{form.employeeId || "Employee"}</strong>.<br />They will now appear in the voter search list.</p>
              <div style={{ background: "#f0faf5", border: "1px solid #b3e6d0", borderRadius: 10, padding: 14, margin: "16px auto", maxWidth: 340, textAlign: "left", fontSize: 13 }}>
                <p style={{ margin: "4px 0" }}><strong>Name:</strong> {empVoter.name}</p>
                <p style={{ margin: "4px 0" }}><strong>DOB:</strong> {empVoter.dob}</p>
                <p style={{ margin: "4px 0" }}><strong>Constituency:</strong> {empVoter.constituency} — {empVoter.area}</p>
                <p style={{ margin: "4px 0" }}><strong>Registered by:</strong> {form.employeeId || "Employee"}</p>
                <p style={{ margin: "4px 0" }}><strong>Registered at:</strong> {new Date().toLocaleString()}</p>
              </div>
              <p style={{ fontSize: 12, color: "#64748b" }}>Voter record saved to the backend database. Face processing: {empVoter.blind === "yes" ? "not required for this accessibility flow" : "completed by the backend AI service"}. OTP and fingerprint steps remain demo-only.</p>
              <button style={{ ...button, marginTop: 8 }} onClick={resetEmpReg}>Register Another Voter</button>
            </div>}
          </div>
        </div>}

        {/* ── Voter Search ── */}
        <label style={{ display: "block", marginTop: 20 }}>Search voter<input style={input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name or voter ID" /></label>
        <div style={{ display: "grid", gap: 8, marginTop: 14 }}>{voters.map((v) => <button key={v.id} onClick={() => { setSelectedVoter(v); setVoteConfirmed(false); setCandidate(""); }} style={{ textAlign: "left", background: selectedVoter?.id === v.id ? "#eef4ff" : "#fff", color: "#17263c", border: selectedVoter?.id === v.id ? "2px solid #155eef" : "1px solid #dce4ee", borderRadius: 10, padding: 14, cursor: "pointer" }}><strong>{v.name}</strong>{v.registeredBy && <span style={{ marginLeft: 8, fontSize: 11, background: "#e8f4ff", color: "#155eef", borderRadius: 6, padding: "2px 7px", fontWeight: 700 }}>Emp. Assisted</span>}<span style={{ display: "block", color: "#64748b", fontSize: 13 }}>{v.id} · {v.blind ? "Alternative accessibility flow" : "Face liveness + fingerprint flow"}</span></button>)}</div>
        {selectedVoter && <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 20, paddingTop: 18 }}><h3>Selected: {selectedVoter.name}</h3><p>{selectedVoter.blind ? "Planned flow: approved alternative identity verification and authorized fingerprint reader." : "Planned flow: face liveness verification followed by authorized fingerprint reader."}</p>{selectedVoter.registeredBy && <p style={{ fontSize: 13, color: "#155eef" }}>Registered by polling employee: <strong>{selectedVoter.registeredBy}</strong></p>}<label>Candidate selection (demo only)<select style={input} value={candidate} onChange={(e) => setCandidate(e.target.value)}><option value="">Select candidate</option>{demoCandidates.map((c) => <option key={c.name} value={c.name}>{c.symbol} {c.name} — {c.party}</option>)}</select></label><button style={{ ...button, marginTop: 14 }} onClick={() => setMessage("Prototype only: voting is disabled until employee authorization, identity hardware, and a secrecy-preserving ballot service are implemented.")}>Continue to confirmation</button>{message && <p role="status" style={{ color: "#7a4b00" }}>{message}</p>}</div>}
      </section>}
    </main>}
    <footer style={{ borderTop: "1px solid #e2e8f0", background: "#fff", padding: "18px 20px", textAlign: "center", color: "#64748b", fontSize: 12 }}>Educational prototype · Synthetic data only · Not approved for official elections</footer>
  </div>;
}
