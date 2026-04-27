# Timesheet Management System

React + TypeScript implementation of a role-based timesheet system with admin and employee workflows, payment calculations, charts, table views, and CSV/PDF reporting.

## Setup

```bash
npm install
npm run dev
```

Build check:

```bash
npm run build
```

## Submission Guidelines

- GitHub Repository: [Timesheet-Management-System](https://github.com/VenkataSubbaiah5022/Timesheet-Management-System)
- Setup Instructions:
  - `npm install`
  - `npm run dev`
  - `npm run build` (verification build)
- Approach:
  - Built with React + TypeScript using a feature-first structure.
  - Uses an API contract layer (`src/services/api/client.ts`) with mock data adapters to keep the app backend-ready.
  - Implements role-based admin/employee workflows, timesheet/payroll calculations, visualization, and reporting.
- Live Link (Optional): [https://timesheet-management-system-sage.vercel.app/](https://timesheet-management-system-sage.vercel.app/)

## Demo Credentials

- Admin: `admin@demo.com` / `admin123`
- Employee: `arjun@demo.com` / `emp123`

## Features

- Basic role-based authentication (mocked)
- Admin:
  - Dashboard KPI cards + chart (Recharts)
  - Employee management with hourly rate assignment
  - Attendance records with table filtering
  - Reports export to CSV/PDF
- Employee:
  - Clock In / Clock Out
  - My timesheet with payable calculations
- Timesheet calculations:
  - Worked hours from clock in/out and break minutes
  - Payable amount = worked hours * hourly rate

## Architecture

- Feature-first folders under `src/features`
- API contract layer in `src/services/api/client.ts`
- Mock adapter and persisted mock database in `src/services/adapters/mock/db.ts`
- Shared reusable UI/table/helpers under `src/shared`
- Routing and app composition:
  - `src/app/router.tsx`
  - `src/app/layout/AppLayout.tsx`
  - `src/app/providers.tsx`

This keeps the frontend adapter-driven, so replacing mock APIs with a real Node/Python + PostgreSQL backend later only requires swapping service implementation, not page rewrites.

## Libraries Used

- React Router (navigation and guards)
- Zustand (auth/session state)
- TanStack Query (server state)
- TanStack Table (grid/table display)
- Recharts (charts/graphs)
- dayjs (date/time)
- PapaParse + jsPDF + jspdf-autotable (report downloads)
- Tailwind CSS utilities and custom shadcn-style primitives
