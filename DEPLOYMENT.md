# Home Cake deployment checklist

## What is prepared

- Render Blueprint: one free Node/Express web service serves both the frontend and API.
- Neon project: `home-cake-demo` (`snowy-glitter-22601685`), primary branch `main` (`br-broad-hat-ba44l8h9`), Frankfurt region.
- Neon PostgreSQL: the `home_cake` schema and all 839 existing rows have been migrated and checked against the local database.
- Neon Object Storage: `home-cake-products` is `public_read`; `home-cake-custom-cakes` is private. Existing uploads have been copied and checked.
- The app uses a pooled Neon connection, TLS certificate verification, and a pool size of five.

## Finish the deployment

1. Create a GitHub repository and push this project. This workspace currently has no Git repository or remote. Keep `.env.local`, `.env`, and `backend/uploads` out of Git; `.gitignore` already excludes them. The project can be public for a portfolio, but do not commit database dumps or credentials.
2. Sign in to Render, connect GitHub, choose **New → Blueprint**, and select the repository. Render will read `render.yaml`; keep the service on the Free plan and Frankfurt region.
3. When Render asks for the Blueprint's unsynchronized values, set:
   - `DATABASE_URL`: the pooled URL in the ignored local `.env.local` file. Do not use `DATABASE_URL_UNPOOLED` for the app.
   - `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY`: copy the matching values from `.env.local` into Render's secret fields.
4. Confirm the generated `JWT_SECRET` remains set. Render's Blueprint generates it. Leave `DATABASE_SSL=true`, pool size `5`, and the two bucket names as declared.
5. Complete the first deploy. If Render assigns a different public hostname than `home-cake-demo.onrender.com`, update `FRONTEND_URL` to the actual HTTPS URL and redeploy.
6. Check `https://<render-host>/health` returns `{"status":"ok"}` and open the shop, product detail, cart, and admin pages. The first request after 15 minutes of inactivity can take about a minute while the free service wakes.
7. To enable checkout, add Stripe **test-mode** `STRIPE_SECRET_KEY` and a test webhook secret as Render environment variables. In Stripe's test dashboard, create a webhook at `https://<render-host>/api/webhooks` for `checkout.session.completed`. Do not use live keys. Without these values, browsing works but checkout is intentionally unavailable.
8. To send actual demo emails, configure a Resend API key and a verified sender address. Email delivery is optional; without these values, email attempts are logged and do not prevent the rest of the app from running.

## Checks before sharing the URL

- Verify `/health`, product listing, product detail images, and the product gallery.
- Test admin login and product image upload using the demo admin account you already use locally.
- Test checkout only with Stripe test mode, and confirm the webhook creates one order for a completed test session.
- Check Render logs after the first deployment; do not paste secret environment values into logs or support requests.

The code and Neon database are prepared, but the project is **not yet deployed**: GitHub and Render account access are not available from this workspace. The GitHub push, Render Blueprint creation, secret entry, and optional Stripe/Resend setup are the remaining manual steps.
