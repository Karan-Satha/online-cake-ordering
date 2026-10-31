# Home Cake

Home Cake is a full-stack cake shop demo with a customer storefront and an admin dashboard. It uses a Node.js/Express API, PostgreSQL, and a responsive HTML/CSS/JavaScript frontend.

## Features

- Browse and filter cakes by category, search products, and view product details, prices, stock, and image galleries.
- Manage a cart and complete checkout through Stripe test mode.
- Submit custom cake requests with inspiration images.
- Administer products, categories, stock, orders, vouchers, and custom cake requests.
- Customer accounts, newsletter subscriptions, and transactional email integrations.

## Stack

- Node.js, Express, PostgreSQL (`pg`)
- Plain JavaScript, HTML, and CSS
- Stripe Checkout and webhooks
- Neon PostgreSQL and Neon Object Storage for the hosted demo
- Render Blueprint for deployment

## Local development

1. Install backend dependencies: `npm ci --prefix backend`.
2. Copy `backend/.env.example` to `backend/.env` and set local PostgreSQL credentials plus a long random `JWT_SECRET`. Stripe, email, and AI keys are optional for local browsing.
3. Start PostgreSQL with the `home_cake` database and apply the SQL files in `backend/migrations` if you are creating a fresh database.
4. Start the app with `npm run dev --prefix backend` and open `http://localhost:3000`.

Run the backend tests with `npm test --prefix backend -- --runInBand`.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the Render and Neon configuration, environment variables, and test-mode integration steps. Never commit `.env` files, database dumps, or uploaded customer images.
