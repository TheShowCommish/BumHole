# BumHole
The Show Ultimate Loser

`bumhole-webpage.html` is the whole app — a single static page backed by Supabase.
Host it anywhere static and share the URL with the league.

## The Odds API key

The key is **not** in the page. It lives as a secret on the Supabase project and is
used by the `odds` edge function in `supabase/functions/odds/`. The browser asks
that function for `odds`, `scores`, or `props`; the function adds the key and calls
The Odds API. Nothing in this repo or in the page source contains the key.

### Setting it up (once)

Log in and link the project:

```bash
npx supabase login
```

```bash
npx supabase link --project-ref joqypzsibdjhewvhdjfx
```

Store the key as a secret — this is the step that matters:

```bash
npx supabase secrets set ODDS_API_KEY=your-key-here
```

Deploy the function:

```bash
npx supabase functions deploy odds
```

### Rotating the key

Generate a new one in The Odds API dashboard, then re-run the `secrets set` command
above. No redeploy needed — the function reads the secret at request time.

### Checking it works

```bash
npx supabase functions logs odds
```

A `500` with "ODDS_API_KEY is not set" means the secret didn't take. A `401` from the
page means the function wasn't deployed, or the page's `SUPABASE_ANON_KEY` is wrong.

## Cost note

Odds are fetched only while someone has the page open. Responses are cached in the
shared `app_config` table, so one fetch serves every viewer rather than one per tab.
