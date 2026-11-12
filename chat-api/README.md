# COET "Get ideas" chat API

The site is static (GitHub Pages), so the chat needs this small server to hold the Anthropic API key.

- `server.mjs`: one endpoint, `POST /chat`, streams the reply. Limits: per-visitor rate, a daily message cap, message length, and only the site's own origins.
- `knowledge.json`: written by `python build.py` from the site's real copy (services, pricing, work). It is everything the assistant knows about COET.

## Run locally
    cd chat-api
    npm install
    ANTHROPIC_API_KEY=sk-ant-... node server.mjs        # http://localhost:8787
Then open http://localhost:4750/?chat=http://localhost:8787 (the override only works on localhost).

## Go live
1. Host this folder on any Node host (Railway, Render, Fly). Start command: `npm start`. Set `ANTHROPIC_API_KEY` and `ALLOWED_ORIGINS` there.
2. Put the public URL in `template.html`: `<meta name="coet-chat" content="https://your-host.example">`, run `python build.py`, push.
Until that meta tag has a URL, the "Get ideas?" button does not appear on the site.
