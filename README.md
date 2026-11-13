# Webhook Event Simulator

A small full-stack app for sending sample webhook events, generating HMAC signatures, and checking whether a signature matches a payload.

## Features
- Submit a webhook endpoint and JSON payload.
- Generate an HMAC-SHA256 signature.
- Simulate a webhook response and latency.
- Verify a payload signature.
- View recent simulation history.
- Check backend health.

## Requirements
- Node.js
- npm

## Run the backend

~~~bash
cd backend
npm install
npm start
~~~

The server uses port 3000 by default. You can set PORT and DEFAULT_SECRET through environment variables. Keep real webhook secrets out of source control.

Open frontend/index.html in a browser to use the interface. If the browser blocks requests because of origin or network settings, serve the frontend through a local web server.

## API routes
| Method | Route | Purpose |
| --- | --- | --- |
| GET | / | Service information |
| GET | /health | Backend health |
| POST | /simulate | Simulate a webhook event |
| POST | /verify | Verify an HMAC signature |
| GET | /history | Recent simulation records |

## Stack
Frontend: HTML, CSS, JavaScript. Backend: Node.js, Express, and crypto.
