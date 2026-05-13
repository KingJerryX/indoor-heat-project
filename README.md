# Indoor Heat Project — MITOS Dashboard

A research dashboard for the **MIT Indoor Heat Study** conducted by the MITOS group at Stanley McCormick Hall (Building W4). Hobo temperature and humidity sensors are deployed in West Tower dorm rooms. This dashboard lets the research team explore per-room thermal data, visualize intervention outcomes, and compare rooms against indoor control and outdoor courtyard readings — all layered over interactive building floor plans.

---

## Table of Contents

1. [Quick Start for Collaborators](#quick-start-for-collaborators)
2. [Project Architecture](#project-architecture)
3. [User Workflow](#user-workflow)
4. [UI Overview](#ui-overview)
5. [Data Pipeline](#data-pipeline)
6. [Codebase Structure](#codebase-structure)
7. [Configuration & Customization](#configuration--customization)
8. [Roadmap](#roadmap)
9. [Authentication Note](#authentication-note)

---

## Quick Start for Collaborators

### Prerequisites

| Tool | Minimum version | Notes |
|------|----------------|-------|
| Node.js | v18+ | [nodejs.org](https://nodejs.org) |
| npm | v9+ | Bundled with Node |
| Python | v3.9+ | For the one-time PDF conversion |
| pip | any | Bundled with Python |

### 1. Clone the repository

```bash
git clone https://github.com/KingJerryX/indoor-heat-project.git
cd indoor-heat-project
```

### 2. Generate floor plan images (one-time setup)

The floor plan PNGs are not committed to the repo (they are generated from the source PDFs). Run the conversion script once:

```bash
pip install PyMuPDF
python scripts/pdf_to_png.py
```

This reads `W4_1.pdf` through `W4_7.pdf` and writes `frontend/public/floorplans/floor-1.png` through `floor-7.png` at 2× resolution (2448×1584 px each) for crisp rendering.

### 3. Install frontend dependencies

```bash
cd frontend
npm install
```

### 4. Start the development server

```bash
npm run dev
```

Open **http://localhost:5173** in your browser. The server hot-reloads on file saves.

### 5. Build for production

```bash
npm run build
```

Output goes to `frontend/dist/`. Deploy that folder to any static host (MIT IS&T locker, Netlify, Vercel, etc.).

---

## Project Architecture

### Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (React SPA)                                        │
│                                                             │
│  Landing page          Floor view           Room popup      │
│  (sky_mccorm.jpg)  →   (floor plan PNG  →   (stats +        │
│  + floor buttons       + sensor nodes)      chart +         │
│                                             interventions)  │
└────────────────────────┬────────────────────────────────────┘
                         │ fetch (Phase 2+)
                         ▼
              ┌──────────────────────┐
              │  FastAPI backend     │  ← Phase 2 (not yet built)
              │  SQLite / Postgres   │
              │  Hobo CSV/XLSX parser│
              └──────────────────────┘
```

### Phase 1 (current state)

The dashboard is a fully static single-page application built with:

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend framework | React 18 + TypeScript | Component model suits the node/popup interaction pattern |
| Build tool | Vite | Fast HMR; simple static output for MIT IS&T hosting |
| Styling | Tailwind CSS | Rapid layout iteration; no design-system overhead |
| Charts | Recharts | Clean time-series; composable React API |
| Routing | React Router v6 | Landing ↔ floor views |
| PDF conversion | PyMuPDF (Python) | One-shot offline script; keeps PDFs as the source of truth |

All data in Phase 1 is **mock data** generated in `frontend/src/data/mockData.ts`. In Phase 2, this file will be replaced by typed API calls to a FastAPI backend.

### Phase 2 (planned backend)

```
backend/
├── app/
│   ├── main.py              FastAPI entry point
│   ├── auth.py              MIT Touchstone (SAML) — reads REMOTE_USER from Apache
│   ├── routers/
│   │   ├── rooms.py         GET /rooms, /rooms/{id}
│   │   ├── readings.py      GET /readings?room=&from=&to=
│   │   ├── floors.py        GET /floors/{n}/summary
│   │   └── ingest.py        POST /ingest (manual upload fallback)
│   ├── ingestion/
│   │   ├── hobo_parser.py   Parses Hobo CSV and XLSX exports
│   │   ├── watcher.py       Watchdog on /data/incoming/
│   │   └── filename_router.py  Maps Room503_Right_2026-05-03.xlsx → sensor
│   ├── models.py            SQLAlchemy ORM
│   └── analytics.py        Daytime/nighttime averages, trajectories
└── data/
    ├── incoming/            Drop CSVs here daily
    ├── processed/           Archived after ingest
    └── heat.db              SQLite (dev) / Postgres (prod)
```

### Database schema (Phase 2)

```sql
floors         floor_number, pdf_filename, png_filename
rooms          room_number, floor_number, tower, orientation, x_norm, y_norm
sensors        sensor_id, room_number, role, position_in_room, serial_number
readings       id, sensor_id, timestamp, temperature_c, humidity_pct
interventions  id, room_number, type, start_date, end_date, notes
intervention_photos  id, intervention_id, image_path, caption
ingest_log     id, filename, sensor_id, rows_added, ingested_at
```

`sensor.role` is one of: `room` | `indoor_control` | `outdoor_courtyard`

---

## User Workflow

### Daily sensor data collection

1. Download that day's export from the Hobo sensor app (CSV or XLSX).
2. Rename the file using the agreed convention:
   ```
   Room{NNN}_{Position}_{YYYY-MM-DD}.{csv|xlsx}
   ```
   Examples:
   ```
   Room503_Right_2026-05-03.xlsx
   Room503_Left_2026-05-03.csv
   Room303_Right_2026-05-03.xlsx
   ```
3. Drop the renamed file into `backend/data/incoming/`. The watchdog daemon picks it up automatically and ingests it.
4. If a file doesn't match the naming convention, use the manual upload UI at `/admin/upload` (Phase 2) to assign it to a room.

### Using the dashboard

1. Open the dashboard (local: `http://localhost:5173`, production: MIT IS&T URL).
2. The **landing page** shows an aerial photo of McCormick Hall with floor buttons overlaid on the right tower. Click a floor number (1–7) to enter that floor's view.
3. The **floor view** shows the W4 floor plan for that floor. Colored nodes mark each instrumented room in the West Tower.
4. **Hover** over a node to see a quick tooltip (room number + current avg temperature).
5. **Click** a node to open the **room popup**, which slides in over the East Tower (which is not part of the study) and shows:
   - Room number and orientation (e.g., North-east facing)
   - Avg daytime temp / avg nighttime temp / avg humidity
   - Last data collection timestamp
   - Intervention cards (AC unit, blackout blinds, reflective film, etc.)
   - A 3-line temperature trajectory chart:
     - **Solid red** = this room
     - **Dashed blue** = indoor control room
     - **Dotted green** = courtyard (outdoor) sensor
6. Click **×** or click outside the popup to return to the floor plan.
7. Use **← All floors** in the sidebar to return to the landing page.

---

## UI Overview

### Landing page

- Full-bleed aerial photo of McCormick Hall (`sky_mccorm.jpg`) as background.
- Dark gradient vignette to make text and buttons readable.
- Header: project title + "Protected by Kerberos sign-in" badge.
- Floor buttons (1–7) absolutely positioned over the right tower of the building photo, spaced to align with actual floor levels.
- Footer hint: "Click a floor to explore sensor readings."

### Floor view

```
┌──────────────────────┬──────────────────────────────────────────┐
│  SIDE PANEL (left)   │  FLOOR PLAN CANVAS (right)               │
│                      │                                          │
│  ← All floors        │  [W4 floor plan PNG, object-contain]     │
│                      │                                          │
│  Floor 5             │    ●  503  (blue — coolest)              │
│  West Tower          │    ●  504  (red — hottest)               │
│                      │    ●  505  (green — middle)              │
│  FLOOR AVERAGES      │                                          │
│  27.9 °C  (red)      │                                          │
│  52 %     (blue)     │                                          │
│  May 12, 6:00 PM     │                                          │
│                      │                                          │
│  Tip card            │                                          │
└──────────────────────┴──────────────────────────────────────────┘
```

**Node color scale:** red = hot (intervention not working / no intervention) → blue = cold (intervention working well). The scale is normalized per floor — the hottest room on each floor anchors the red end and the coolest anchors blue, regardless of absolute temperature, making relative comparisons visually obvious.

**Node placement:** Nodes are positioned using `(xNorm, yNorm)` coordinates (0–1) over the rendered floor plan image. A `ResizeObserver` hook tracks the exact pixel rect of the image (accounting for `object-contain` letterboxing) and positions nodes within that rect, so they stay locked to rooms at any viewport size.

### Room popup

When a node is clicked, a card overlays the **East Tower half** of the floor plan (the East Tower has no sensors in this study, so covering it is intentional):

```
┌──────────────────────────────────────────────────┐  ×
│  Room 503                Avg daytime:  27.3 °C   │
│  North-east facing       Avg nighttime: 24.8 °C  │
│                          Avg humidity:  52 %      │
│                          Last collected: May 12   │
├──────────────────────────────────────────────────┤
│  INTERVENTIONS                                   │
│  ❄️ Window AC unit   🪟 Blackout blinds           │
├──────────────────────────────────────────────────┤
│  LATEST TEMPERATURE TRAJECTORY                   │
│                                                  │
│  [Recharts line chart — 5 days of hourly data]   │
│  — this room (red solid)                         │
│  - - indoor control (blue dashed)                │
│  ··· courtyard outdoor (green dotted)            │
└──────────────────────────────────────────────────┘
```

---

## Data Pipeline

### Sensor file naming convention

Files must follow this pattern for automatic ingestion:

```
Room{NNN}_{Position}_{YYYY-MM-DD}.{xlsx|csv}
```

| Part | Values | Example |
|------|--------|---------|
| `{NNN}` | 3-digit room number | `503` |
| `{Position}` | Sensor placement | `Left` or `Right` |
| `{YYYY-MM-DD}` | Export date | `2026-05-03` |
| Extension | Hobo format | `.xlsx` or `.csv` |

Files that don't match fall back to the manual upload UI.

### Sensor roles

Each sensor has a `role` field:

| Role | Description |
|------|-------------|
| `room` | An instrumented study room (shown as a clickable node) |
| `indoor_control` | A non-intervened room used as the dashed comparison line |
| `outdoor_courtyard` | The courtyard sensor, used as the dotted outdoor comparison line |

### Daytime / nighttime split

Daytime is defined as **07:00–19:00 local time**. The split is configurable in `analytics.py` (Phase 2). Averages outside those hours are classified as nighttime.

---

## Codebase Structure

```
indoor-heat-project/
│
├── W4_1.pdf – W4_7.pdf        Source floor plan PDFs (floors 1–7)
├── sky_mccorm.jpg              Hero image for the landing page
├── Dashboard sketch.pdf        Original hand-drawn UI wireframe
├── Right sensor *.xlsx         Sample Hobo sensor export
│
├── scripts/
│   └── pdf_to_png.py           Converts PDFs → PNG (run once after cloning)
│
├── frontend/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── package.json
│   │
│   ├── public/
│   │   ├── sky_mccorm.jpg
│   │   └── floorplans/         ← generated by pdf_to_png.py (git-ignored)
│   │       ├── floor-1.png
│   │       └── … floor-7.png
│   │
│   └── src/
│       ├── main.tsx            App entry + React Router setup
│       ├── index.css           Tailwind base
│       │
│       ├── pages/
│       │   ├── Landing.tsx     Hero photo + floor nav buttons
│       │   └── FloorView.tsx   Floor plan + nodes + popup orchestration
│       │
│       ├── components/
│       │   ├── SidePanel.tsx           Left sidebar (floor-wide averages)
│       │   ├── RoomNode.tsx            Colored pulsing dot
│       │   ├── RoomPopup.tsx           East-tower overlay card
│       │   └── TempTrajectoryChart.tsx Recharts 3-line chart
│       │
│       ├── config/
│       │   ├── floors.ts       Floor → PNG path + button position on hero
│       │   └── rooms.ts        Room → (floor, xNorm, yNorm, orientation)
│       │
│       ├── data/
│       │   └── mockData.ts     Synthetic readings (replaced by API in Phase 2)
│       │
│       └── lib/
│           ├── colorScale.ts       temp → HSL color (red=hot, blue=cold)
│           └── useElementSize.ts   ResizeObserver hook + object-contain math
│
└── .gitignore
```

---

## Configuration & Customization

### Adding a new sensor room

Open [`frontend/src/config/rooms.ts`](frontend/src/config/rooms.ts) and add an entry to the `ROOMS` array:

```ts
makeRoom(506, 5, "South-east facing"),   // room number, floor, orientation
```

Then set the node's `(xNorm, yNorm)` position. `xNorm` and `yNorm` are fractions of the floor plan image width/height (0 = top/left, 1 = bottom/right). The right column of West Tower rooms (501–508, 301–308) all share `xNorm ≈ 0.308`. Vertical positions are set by the `ROW_Y` map keyed on the last digit of the room number.

> **Fine-tuning tip:** The planned `/admin/calibrate` page (Phase 7) will let you click directly on a room in the browser to set its coordinates visually. Until then, adjust the constants in `rooms.ts` and hot-reload to see the result.

### Adjusting floor button positions on the landing page

The floor buttons are positioned over the building photo via normalized coordinates in [`frontend/src/config/floors.ts`](frontend/src/config/floors.ts). Change `buttonX` / `buttonY` for any floor to move its button.

### Changing the color scale domain

[`frontend/src/lib/colorScale.ts`](frontend/src/lib/colorScale.ts) maps temperature to an HSL hue from 220° (blue, cold) to 0° (red, hot). The min/max is computed per-floor at runtime in `FloorView.tsx` so the scale always spans the full red-to-blue range across the rooms actually on that floor.

### Swapping the landing page photo

Replace `frontend/public/sky_mccorm.jpg` with any image at the same filename. No code change needed.

---

## Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ **Done** | Static skeleton — landing, floor views, nodes, popup, mock data |
| 2 | Planned | FastAPI backend, SQLite DB, Hobo CSV/XLSX parser, real API calls |
| 3 | Planned | Daily ingestion pipeline — folder watcher, filename routing, idempotent ingest |
| 4 | Planned | Analytics — daytime/nighttime averages, humidity trajectories, floor summaries |
| 5 | Planned | Intervention CRUD — photo upload, admin management UI |
| 6 | Planned | Auth & deploy — MIT Touchstone via Apache, MIT IS&T locker hosting |
| 7 | Planned | Admin polish — click-to-calibrate node coordinates, sensor management |

---

## Authentication Note

The production deployment will be **protected by MIT Kerberos (Touchstone)**. Touchstone is MIT's SAML-based single sign-on. On MIT IS&T-hosted Apache servers, it is handled at the web server layer — the backend simply reads `REMOTE_USER` from the environment. An allowlist of authorized Kerberos IDs is checked on first request.

For local development, set `DEV_AUTH=true` in your environment to bypass the auth gate entirely. No SAML libraries are needed for local work.

---

*Built for the MIT MITOS Indoor Heat Project · West Tower, Stanley McCormick Hall (Building W4)*
