from datetime import date

from services.mock_aadhaar import verify_mock_identity


def test_valid_synthetic_identity_matches():
    matched, message = verify_mock_identity("TEST-ID-1001", "Asha Demo", date(2000, 1, 15))
    assert matched is True
    assert "matched" in message.lower()


def test_name_mismatch_fails():
    matched, _ = verify_mock_identity("TEST-ID-1001", "Wrong Demo", date(2000, 1, 15))
    assert matched is False


def test_dob_mismatch_fails():
    matched, _ = verify_mock_identity("TEST-ID-1001", "Asha Demo", date(2001, 1, 15))
    assert matched is False


def test_unknown_synthetic_id_fails():
    matched, _ = verify_mock_identity("NOT-A-TEST-ID", "Asha Demo", date(2000, 1, 15))
    assert matched is False


def test_name_case_and_spacing_are_normalized():
    matched, _ = verify_mock_identity("TEST-ID-1001", "  ASHA   DEMO ", date(2000, 1, 15))
    assert matched is True
