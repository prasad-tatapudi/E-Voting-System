from services.face_recognition_service import (
    get_face_embedding,
    compare_faces
)


REFERENCE_IMAGE = "reference.jpg"
LIVE_IMAGE = "live.jpg"


with open(REFERENCE_IMAGE, "rb") as file:
    reference_bytes = file.read()


with open(LIVE_IMAGE, "rb") as file:
    live_bytes = file.read()


reference_embedding = get_face_embedding(
    reference_bytes
)

live_embedding = get_face_embedding(
    live_bytes
)


if reference_embedding is None:
    print("Could not detect exactly one face in reference image.")
    raise SystemExit


if live_embedding is None:
    print("Could not detect exactly one face in live image.")
    raise SystemExit


similarity, match = compare_faces(
    reference_embedding,
    live_embedding
)


print()
print("Face Matching Test")
print("------------------")
print(f"Similarity: {similarity:.4f}")
print(f"Match: {match}")