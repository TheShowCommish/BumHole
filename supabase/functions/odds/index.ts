// Odds proxy — keeps the The Odds API key server-side.
//
// The browser never sees ODDS_API_KEY. It asks this function for one of three
// named endpoints; the function builds the upstream URL itself. Deliberately
// NOT a general passthrough — an open proxy would let anyone spend the key on
// any endpoint they liked.

const ODDS_API_KEY = Deno.env.get("ODDS_API_KEY") ?? "";
const SPORT = "americanfootball_nfl";
const PROP_MARKETS = "player_pass_tds,player_rush_yds,player_reception_yds,player_anytime_td";
const BASE = "https://api.the-odds-api.com/v4/sports";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, ...extra, "Content-Type": "application/json" },
  });
}

function upstreamUrl(endpoint: string, eventId: string | null): string | null {
  const key = `apiKey=${ODDS_API_KEY}`;
  switch (endpoint) {
    case "odds":
      return `${BASE}/${SPORT}/odds/?${key}&regions=us&markets=h2h,spreads,totals&oddsFormat=american&bookmakers=draftkings`;
    case "scores":
      return `${BASE}/${SPORT}/scores/?${key}&daysFrom=3`;
    case "props":
      if (!eventId || !/^[a-zA-Z0-9]+$/.test(eventId)) return null;
      return `${BASE}/${SPORT}/events/${eventId}/odds/?${key}&regions=us&markets=${PROP_MARKETS}&oddsFormat=american&bookmakers=draftkings`;
    default:
      return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  if (!ODDS_API_KEY) {
    return json({ error: "ODDS_API_KEY is not set on this project." }, 500);
  }

  // Params may arrive as a JSON body (supabase-js functions.invoke) or as a
  // query string (plain fetch / curl).
  let endpoint: string | null = null;
  let eventId: string | null = null;
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      endpoint = body.endpoint ?? null;
      eventId = body.eventId ?? null;
    }
  } catch { /* fall through to query params */ }
  const qs = new URL(req.url).searchParams;
  endpoint ??= qs.get("endpoint");
  eventId ??= qs.get("eventId");

  const url = upstreamUrl(endpoint ?? "", eventId);
  if (!url) {
    return json({ error: `Unknown endpoint '${endpoint}' (expected odds, scores, or props).` }, 400);
  }

  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) {
    // Pass the upstream status through so the page's error handling still works,
    // but don't echo the body — it can contain the key in an error message.
    return json({ error: `The Odds API returned ${res.status}.` }, res.status);
  }

  return new Response(text, {
    status: 200,
    headers: {
      ...CORS,
      "Content-Type": "application/json",
      // Handy for the credit meter; the-odds-api sends these on every response.
      "x-requests-remaining": res.headers.get("x-requests-remaining") ?? "",
      "x-requests-used": res.headers.get("x-requests-used") ?? "",
    },
  });
});
