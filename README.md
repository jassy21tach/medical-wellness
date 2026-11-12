# medical-wellness backend

nestjs + postgres + prisma. appointment scheduling for a wellness center.

## setup

```powershell
cd apps/api
npm install
cp .env.example .env
# fill DATABASE_URL and JWT_SECRET
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev
```

port 4000. swagger at /api/docs.

## login

admin@example.local / ChangeMeDevOnly!2026 (dev only, change in prod)

## endpoints

auth:
- POST /api/v1/auth/login

clients:
- POST /api/v1/clients
- GET /api/v1/clients?search=
- GET /api/v1/clients/:id
- PATCH /api/v1/clients/:id

employees:
- POST /api/v1/employees
- GET /api/v1/employees?active=
- GET /api/v1/employees/:id
- PATCH /api/v1/employees/:id

appointments:
- POST /api/v1/appointments
- GET /api/v1/appointments?from=&to=&employeeId=&clientId=&status=
- GET /api/v1/appointments/:id
- PATCH /api/v1/appointments/:id
- PATCH /api/v1/appointments/:id/cancel

health:
- GET /api/v1/health