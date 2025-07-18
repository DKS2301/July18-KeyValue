# XPressMeal Backend

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file with:
   ```env
   MONGODB_URI=mongodb://localhost:27017/xpressmeal
   JWT_SECRET=supersecretkey
   ```
3. Start MongoDB locally or use a cloud URI.

## Run

- Development (with nodemon):
  ```bash
  npm run dev
  ```
- Production:
  ```bash
  npm start
  ```

## API Endpoints

- `POST /api/auth/login` — Login or register (phone/roll)
- `GET /api/menu/today` — Get today’s menu
- `POST /api/orders` — Place order (JWT required)
- `GET /api/orders/mine` — My orders (JWT required)
- `GET /api/admin/orders` — All orders (admin JWT)
- `GET /api/admin/dues` — Dues list (admin JWT)
- `POST /api/admin/clear` — Clear orders & reset (admin JWT) 

## Seed Sample Data

To create a sample admin user and today’s menu:

```bash
node seed.js
``` 