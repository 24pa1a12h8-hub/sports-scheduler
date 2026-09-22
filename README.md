# Sports Scheduler - WD501 Advanced Backend Capstone Project

A complete, production-ready full-stack web application built for the **WD501 Advanced Backend** curriculum. The platform enables administrators to manage available sports categories and view deep analytical reports on sport popularity, while allowing players to create, discover, join, and cancel sports matches with live participant slot tracking and schedule conflict detection.

---

## 🌟 Key Features

### 👤 Administrator Persona
- **Secure Authentication**: Admin login using email and password with bcryptjs hashing and session management.
- **Dedicated Admin Hub**: Real-time KPI counters for sports, total matches, active sessions, and registered players.
- **Sports Category Management**:
  - Create new official sports (validates non-empty names, prevents duplicates).
  - Edit existing sports.
  - View all sports created with associated match counts.
- **Analytics & Popularity Reports**:
  - Filter by custom date ranges (`startDate` to `endDate`).
  - Total matches played/scheduled within the period.
  - Breakdown by sport with session counts and relative popularity percentages.
  - Responsive visual popularity bar chart and tabular breakdown.
- **Full Operational Access**: Create sessions, join sessions, and cancel sessions as needed.

### ⚽ Player Persona
- **Player Registration & Sign In**:
  - Name, valid email format, min 6-char password, password confirmation.
  - Automatic role enforcement (`player` role only; admin privilege escalation blocked).
  - Secure bcryptjs password hashing (passwords never stored in plain text).
- **Player Dashboard**:
  - Personalized overview showing enrolled sessions and created sessions.
  - Quick actions to browse sessions or host a new match.
- **Sport Session Lifecycle**:
  - **Create Sessions**: Choose from admin-configured sports, pick future date & time, specify venue, and define participant slots needed. Rejects past dates/times.
  - **Browse & Filter**: Switch between *Available Matches*, *My Created Sessions*, *Sessions You Joined*, and *All Sessions*.
  - **Live Participant Slots**: Rich session view displaying organizer, numbered player slots (`1. Player Name`, `2. Player Name`, `3. Empty slot`, ...), and real-time remaining slots counter.
  - **Join Sessions**: Join available matches with instant capacity validation; blocks duplicate joining, full sessions, past sessions, or creator self-joining.
  - **Time Conflict Detection (Course Optional Feature)**: Automatically blocks a player from joining or creating overlapping sessions occurring at the exact same date and time.
  - **Session Cancellation**: Creator (or admin) can cancel a session by providing a mandatory reason. Cancelled matches show a red cancellation banner, display the cancellation reason, and block any new joins.
- **Self-Service Security (Course Optional Feature)**:
  - Authenticated password change requiring verification of current password before updating.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Runtime & Framework** | Node.js (v24.x) + Express.js |
| **Database & ORM** | MySQL 8.4 + Sequelize ORM (with Sequelize CLI migrations & seeders) |
| **Authentication** | Passport.js (`LocalStrategy`), `express-session`, `bcryptjs` |
| **Flash Messages** | `connect-flash` |
| **Views / UI** | EJS Templates + Tailwind CSS (via CDN) + Modern SVG Icons |
| **Testing** | Jest + Supertest (32 automated integration tests) |
| **Environment** | `dotenv`, `cross-env` |

---

## 🗄️ Database Design & Models

- **`Users`**: `id`, `name`, `email` (unique), `passwordHash`, `role` (`admin` | `player`), `createdAt`, `updatedAt`.
- **`Sports`**: `id`, `name` (unique), `userId` (FK -> `Users.id`), `createdAt`, `updatedAt`.
- **`Sessions`**: `id`, `sportId` (FK -> `Sports.id`), `creatorId` (FK -> `Users.id`), `date`, `time`, `venue`, `additionalPlayersNeeded`, `status` (`scheduled` | `cancelled`), `cancellationReason`, `createdAt`, `updatedAt`.
- **`SessionParticipants`**: `id`, `sessionId` (FK -> `Sessions.id`), `userId` (FK -> `Users.id`), `joinedAt`, `createdAt`, `updatedAt` (with composite unique index on `[sessionId, userId]`).

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher; tested on v24)
- [MySQL Server](https://www.mysql.com/) (v8.0 or higher; tested on v8.4)

### 2. Environment Configuration
Copy `.env.example` to `.env` and adjust your MySQL credentials:
```bash
cp .env.example .env
```
Example `.env`:
```env
PORT=3000
NODE_ENV=development
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=sports_scheduler_development
DB_TEST_NAME=sports_scheduler_test
SESSION_SECRET=super_secret_session_key_2026
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Migrations & Seed Data
```bash
# Run migrations on the development database
npm run migrate

# Seed initial admin, player, sports, and sample sessions
npm run seed
```

### 5. Start the Application
```bash
npm start
```
Open your browser at: **`http://localhost:3000`**

---

## 🔑 Default Credentials for Quick Evaluation

| Persona | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@example.com` | `Admin@123` | `admin` |
| **Player** | `player@example.com` | `Player@123` | `player` |

---

## 🧪 Automated Testing

The project includes 32 automated integration tests across 7 comprehensive test suites covering authentication, authorization, sports, sessions, participant slots, cancellation, and admin analytics reports:

```bash
npm test
```

### Test Coverage Highlights:
- **Authentication**: Registration, duplicate email rejection, validation, password hashing, login success/failure, logout, and password updates.
- **Role-Based Authorization**: Unauthenticated redirection, normal players blocked from admin dashboards/sports/reports, admin authorized access.
- **Sports Management**: Admin sport creation, duplicate rejection, editing sport names, non-admin restriction.
- **Sessions**: Session creation, past date rejection, invalid input rejection, session catalog display.
- **Participants**: Joining matches, slot deduction, slot roster rendering (`Player Name` vs `Empty slot`), duplicate join prevention, full session prevention, past session prevention, and concurrent schedule conflict prevention.
- **Cancellation**: Creator and admin cancellation with mandatory reason, cancelled session status rendering, join prevention on cancelled matches.
- **Analytics & Reports**: Database aggregation of session counts and percentage calculations per sport over date windows.

---

## 📄 License
ISC &copy; 2026 Sharmila Pedireddy - WD501 Advanced Backend Capstone.
