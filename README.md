# BumHole
Fantasy Ultimate Bumhole — The Show Ultimate Loser

`bumhole-webpage.html` is the whole app — a single static page backed by Supabase.
Host it anywhere static and share the URL with the league.

## The logo

The header loads `logo.png` from the same directory as the HTML file. It is a
transparent PNG — the white card the artwork shipped with was knocked out so the
ball sits directly on the dark background. Replace the file to change the logo;
keep the transparency or it will render as a white rectangle.

If the file is ever missing, the page falls back to a styled text wordmark rather
than a broken image.

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
npx supabase link --project-ref pivwbrmbpyoaqvejvgad
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

## Player props and what they cost

The Odds API carries a lot more than the four prop markets this board originally
asked for — touchdowns, passing, rushing, receiving, combined yardage, kicking
and defense, 26 markets in all. The **Player Props** panel above the board is
where you choose which ones to pull.

The reason it is a choice and not just "show everything" is billing. The
event-odds endpoint costs **one credit per market, per game you open props on**.
Six markets across ten games is 60 credits for one pass. So:

- `MAX_PROP_MARKETS` caps the selection at 8. The page enforces it and the edge
  function enforces it again, so a hand-edited request cannot go wider.
- Results are cached per game *and per market* for 10 minutes, shared across every
  viewer. Adding a market to your selection only pays for that market — everything
  already pulled stays free.
- Markets the book has not posted yet are remembered as "checked, nothing there"
  so they are not re-billed on every render, and the game card names them
  explicitly. Early in the week DraftKings often has only Anytime TD up; the
  yardage and reception lines appear closer to kickoff. That is the API being
  honest, not the board being broken.

The market selection is stored per browser in `localStorage`, so one person
browsing defensive props does not reshape everyone else's board. Credits, being
real money, are tracked in the shared table and shown in the top-left badge.

Adding a market means listing it in `PROP_MARKETS` in the page **and** in
`ALLOWED_PROP_MARKETS` in the edge function, then redeploying the function.

## Cost note

Odds are fetched only while someone has the page open. Responses are cached in the
shared `app_config` table, so one fetch serves every viewer rather than one per tab.
