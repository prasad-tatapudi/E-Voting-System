import cv2
import numpy as np
import json
import time

from insightface.app import FaceAnalysis


# ---------------------------------------------------------
# Load InsightFace model once when the server starts
# ---------------------------------------------------------

face_app = FaceAnalysis(
    name="buffalo_l",
    providers=["CPUExecutionProvider"]
)

# Smaller detection size = faster CPU processing
face_app.prepare(
    ctx_id=0,
    det_size=(320, 320)
)


# ---------------------------------------------------------
# Generate face embedding
# ---------------------------------------------------------

def get_face_embedding(image_bytes: bytes):
    """
    Generate a normalized face embedding from image bytes.

    Returns:
        numpy.ndarray: normalized face embedding
        None: if image is invalid or exactly one face
              is not detected.
    """

    start_time = time.perf_counter()

    # Convert bytes to image
    image_array = np.frombuffer(
        image_bytes,
        dtype=np.uint8
    )

    image = cv2.imdecode(
        image_array,
        cv2.IMREAD_COLOR
    )

    decode_time = time.perf_counter()

    if image is None:
        print("[FACE] Invalid image")
        return None

    # InsightFace face detection + recognition
    faces = face_app.get(image)

    insightface_time = time.perf_counter()

    # No face detected
    if len(faces) == 0:
        print(
            f"[FACE] faces=0 | "
            f"InsightFace={insightface_time - decode_time:.2f}s"
        )
        return None

    # More than one face detected
    if len(faces) > 1:
        print(
            f"[FACE] faces={len(faces)} | "
            f"Multiple faces detected | "
            f"InsightFace={insightface_time - decode_time:.2f}s"
        )
        return None

    # Exactly one face
    embedding = faces[0].embedding

    # Normalize embedding
    norm = np.linalg.norm(embedding)

    if norm == 0:
        print("[FACE] Embedding has zero norm")
        return None

    embedding = embedding / norm

    total_time = time.perf_counter()

    print(
        f"[FACE] faces=1 | "
        f"decode={decode_time - start_time:.2f}s | "
        f"InsightFace={insightface_time - decode_time:.2f}s | "
        f"total={total_time - start_time:.2f}s"
    )

    return embedding


# ---------------------------------------------------------
# Compare two face embeddings
# ---------------------------------------------------------

def compare_faces(
    reference_embedding: np.ndarray,
    live_embedding: np.ndarray,
    threshold: float = 0.45
):
    """
    Compare two face embeddings using cosine similarity.

    Returns:
        similarity, match
    """

    reference_norm = np.linalg.norm(reference_embedding)
    live_norm = np.linalg.norm(live_embedding)

    if reference_norm == 0 or live_norm == 0:
        return 0.0, False

    reference_embedding = (
        reference_embedding / reference_norm
    )

    live_embedding = (
        live_embedding / live_norm
    )

    similarity = float(
        np.dot(
            reference_embedding,
            live_embedding
        )
    )

    match = similarity >= threshold

    return similarity, match


# ---------------------------------------------------------
# Convert embedding -> JSON
# ---------------------------------------------------------

def embedding_to_json(embedding: np.ndarray) -> str:
    """
    Convert a NumPy embedding into JSON text
    for PostgreSQL storage.
    """

    return json.dumps(
        embedding.astype(float).tolist()
    )


# ---------------------------------------------------------
# Convert JSON -> embedding
# ---------------------------------------------------------

def json_to_embedding(embedding_json: str) -> np.ndarray:
    """
    Convert stored JSON text back into a NumPy embedding.
    """

    values = json.loads(embedding_json)

    embedding = np.array(
        values,
        dtype=np.float32
    )

    norm = np.linalg.norm(embedding)

    if norm == 0:
        raise ValueError(
            "Stored face embedding has zero norm."
        )

    return embedding / norm