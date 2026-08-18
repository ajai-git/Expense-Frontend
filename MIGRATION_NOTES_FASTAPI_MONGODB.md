# FastAPI + MongoDB Migration Notes

This project no longer uses Supabase.

## Frontend

- Removed `@supabase/supabase-js` from `package.json`.
- Removed `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env`.
- Added `VITE_API_BASE_URL=http://localhost:8000/api/v1`.
- Added `src/lib/api.ts` for FastAPI requests.
- Added `src/lib/mongoApi.ts`, a small compatibility query layer used by the existing React screens.
- Updated all pages to use `mongoDb.from(...)` instead of Supabase.

## Backend

- Added `backend/app/features/generic_crud/router.py`.
- Registered it in `backend/main.py` under `/api/v1/db`.
- The UI now calls FastAPI, and FastAPI writes/reads MongoDB collections.
- Replaced old Supabase audit/dependency references with Motor/MongoDB.
- Fixed `require_roles(["admin", "manager"])` compatibility in `security.py`.

## Run

Backend:

```bash
cd backend
pip install -r requirements.txt
python main.py
```

Frontend:

```bash
npm install
npm run dev
```

Make sure MongoDB is running and `.env` has the correct `MONGODB_URL` and `DATABASE_NAME`.
