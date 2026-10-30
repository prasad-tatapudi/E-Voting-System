
"""
Development-only mock identity verification.

Uses fictional test IDs only. This module does not connect to UIDAI
or any real Aadhaar service.
"""

from datetime import date

# Synthetic records for local development only.
# Do not replace these with real Aadhaar numbers or personal data.
MOCK_RECORDS = {
    "TEST-ID-1001": {
        "name": "Asha Demo",
        "dob": date(2000, 1, 15),
    },
    "TEST-ID-1002": {
        "name": "Ravi Demo",
        "dob": date(1998, 6, 20),
    },
    "TEST-ID-1003": {
        "name": "Mina Demo",
        "dob": date(2002, 11, 5),
    },
}


def normalize_name(value: str) -> str:
    """Normalize spaces and case for demo-only name matching."""
    return " ".join(value.strip().split()).casefold()


def verify_mock_identity(
    mock_id: str,
    submitted_name: str,
    submitted_dob: date,
) -> tuple[bool, str]:
    """
    Return (matched, message).

    Exact date of birth and normalized name must match the synthetic record.
    This result is a demo simulation, not proof of real identity.
    """
    record = MOCK_RECORDS.get(mock_id.strip().upper())

    if record is None:
        return False, "Synthetic test identity not found."

    name_matches = (
        normalize_name(submitted_name)
        == normalize_name(record["name"])
    )
    dob_matches = submitted_dob == record["dob"]

    if not name_matches or not dob_matches:
        return False, "Details do not match the synthetic test record."

    return True, "Mock identity details matched."
