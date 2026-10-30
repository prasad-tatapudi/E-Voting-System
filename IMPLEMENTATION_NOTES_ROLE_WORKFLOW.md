# Smart AI Digital Voting Prototype — Role Workflow

## Current prototype scope
- Landing page with User/Voter, Candidate, and Polling Employee role selection.
- Role-specific registration/login forms and dashboards.
- User registration collects name, date of birth, address, city, mobile, email, optional existing voter ID, synthetic-only Aadhaar test value, demo OTP, disability selection, and certificate file input for the blindness flow.
- Demo OTP is fixed to `123456`; no SMS or Aadhaar/UIDAI request is made.
- Candidate registration includes nomination number, constituency, synthetic identity demo, and password.
- Employee registration collects name, government-issued employee ID, and password. Without an authorized employee-directory integration, employee status remains unverified and polling permissions are not granted.
- User dashboard is information-only; it does not permit online voting.
- Candidate dashboard shows constituency-level placeholders and published-results placeholders only; it does not show individual voter data.
- Employee workspace uses synthetic voter records and displays a clearly labelled demo voting workflow. It does not submit a real vote.
- Registration now requires a password (minimum 8 characters) and password confirmation for the user/candidate/employee forms; user registration also requires email so the login interface has a login identifier.

## Run
Backend:
1. Configure a local PostgreSQL `DATABASE_URL` privately; do not commit real passwords.
2. In `backend`, activate the virtual environment and install requirements: `python -m pip install -r requirements.txt`.
3. Run: `python -m uvicorn main:app --reload`.

Frontend:
1. In a second terminal, run `cd frontend`.
2. Run `npm install`.
3. Run `npm run dev`.

## Known limitations — not production ready
- The role portal's login and registration are prototype UI flows, not a complete persistent backend authentication system.
- No real Aadhaar/UIDAI authentication or SMS OTP is connected. Never enter real Aadhaar data; use synthetic test values only.
- Face liveness is not completed by this role portal. Fingerprint reader support requires compatible hardware and an authorized integration.
- Certificate upload is a UI input; it is not validated against an issuing authority.
- Government employee ID, candidate nomination, and voter eligibility are not verified against official systems.
- The demo voter list and constituency/candidate values are synthetic placeholders.
- A privacy-preserving secret-ballot architecture and end-to-end voting/counting service are not implemented by this UI update.
- This is an educational prototype, not approved for official elections. Real deployment requires authorized integrations, legal review, independent security and accessibility audits, and election-authority approval.
