# RecoPay 💳

A full-stack FinTech web application for managing loans, EMI payments, and repayment schedules — built with React, Node.js, Express, and MongoDB.

---

## 🔗 Live Demo

- **Frontend:** https://ojt-project-sem-2-7qp1.vercel.app/login
- **Backend API:** https://recopay.onrender.com

---

## 🚀 Features

- Google OAuth 2.0 Authentication
- Loan application with multi-step form
- Reducing-balance EMI Calculator
- Loan approval workflow (Pending → Approved → Active)
- Repayment schedule with per-installment tracking
- Razorpay payment gateway integration
- Transaction history
- Support ticket system
- Responsive dark-themed UI

---

## 🛠️ Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React 19, Vite, React Router DOM    |
| Backend  | Node.js, Express.js                 |
| Database | MongoDB Atlas (Mongoose)            |
| Auth     | Google OAuth 2.0 + JWT              |
| Payments | Razorpay                            |
| Deploy   | Vercel (frontend), Render (backend) |

---

## 📂 Project Structure

```
OJT_PROJECT-SEM2/
├── backend/          # Express API server
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── validators/
│   └── server.js
└── frontend/
    └── RecoPay/      # Vite + React app
        ├── src/
        │   ├── api/
        │   ├── components/
        │   ├── context/
        │   └── pages/
        └── index.html
```

---

## ⚙️ Local Setup

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster (or local MongoDB)
- A [Razorpay](https://razorpay.com) test account
- A [Google Cloud](https://console.cloud.google.com) OAuth 2.0 Client ID

---

### 1. Clone the Repository

```bash
git clone https://github.com/PrateekKumar-og/OJT_PROJECT-SEM2.git
cd OJT_PROJECT-SEM2
```

---

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file inside `backend/`:

```env
# MongoDB
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/recopay

# JWT
JWT_SECRET=your_super_secret_jwt_key

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxx
RAZORPAY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret

# Server (optional, defaults to 5000)
PORT=5000
```

Start the backend:

```bash
# Development (with auto-reload via nodemon)
npm run dev

# Production
npm start
```

The API will be available at `http://localhost:5000`.

---

### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend/RecoPay
npm install
```

The frontend uses a hardcoded API URL pointing to the deployed backend. To point it at your **local** backend during development, update the `API_URL` constant in:

- `src/api/loan.api.js`
- `src/api/payment.api.js`
- `src/api/transaction.api.js`

Change:
```js
const API_URL = "https://recopay.onrender.com/api";
```
to:
```js
const API_URL = "http://localhost:5000/api";
```

Start the frontend:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## 🌐 Production Deployment

### Frontend → Vercel

1. Push your code to GitHub.
2. Import the repository at [vercel.com/new](https://vercel.com/new).
3. Set the **Root Directory** to `frontend/RecoPay`.
4. Vercel auto-detects Vite — no extra configuration needed.
5. The included `vercel.json` handles SPA routing rewrites.

### Backend → Render

1. Create a new **Web Service** on [render.com](https://render.com).
2. Set the **Root Directory** to `backend`.
3. Set **Build Command** to `npm install`.
4. Set **Start Command** to `npm start`.
5. Add all environment variables from the `.env` section above under **Environment**.

---

## 🔐 Environment Variables Reference

### Backend (`backend/.env`)

| Variable                  | Description                                    | Required |
|---------------------------|------------------------------------------------|----------|
| `MONGO_URI`               | MongoDB Atlas connection string                | ✅       |
| `JWT_SECRET`              | Secret key for signing JWT tokens              | ✅       |
| `RAZORPAY_KEY_ID`         | Razorpay API key ID (test or live)             | ✅       |
| `RAZORPAY_SECRET`         | Razorpay API secret                            | ✅       |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook signature secret              | ✅       |
| `PORT`                    | Server port (default: `5000`)                  | ❌       |

### Frontend

The frontend has no `.env` file — the API base URL is configured directly in the `src/api/*.js` files.

---

## 👨‍💻 Authors

- **Prateek Kumar** — [@PrateekKumar-og](https://github.com/PrateekKumar-og)
- **Yush** — [@yush-1018](https://github.com/yush-1018)

---

## 📄 License

[MIT](LICENSE)
