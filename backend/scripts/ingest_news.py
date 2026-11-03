import os
import re
import json
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv
import requests
import google.generativeai as genai
from supabase import create_client, Client

# Scrapling TLS-impersonating Fetcher (with graceful fallback if not yet installed)
try:
    from scrapling.fetchers import Fetcher
    HAS_SCRAPLING = True
except ImportError:
    HAS_SCRAPLING = False

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent
ENV_PATH = PROJECT_ROOT / ".env.local"

load_dotenv(ENV_PATH)
load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(".env.local")
load_dotenv(".env")

SOTA_PATH = BASE_DIR / "ml" / "models" / "latest_sota_predictions.json"
DIGEST_OUT_PATH = BASE_DIR / "ml" / "models" / "gw_intelligence_digest.json"

FPL_YOUTUBE_CHANNELS = {
    "FPL Focal": "UC72Q8fdLQ61bf0XCjfWW0fe",
    "Let's Talk FPL": "UCable6LV15814b34mt0lDig",
    "FPL Harry": "UCcPWnCj5AKC19HaySZv2ffg",
    "Planet FPL": "UC8043oOKTB4fP8s154115tA",
    "The FPL Wire": "UC4A91fe1E2p0Lf2M56v0qzw",
}


def smart_get_json(url: str) -> dict:
    """Uses Scrapling's browser TLS fingerprint spoofing to fetch JSON without 403 blocks."""
    if HAS_SCRAPLING:
        try:
            fetcher = Fetcher()
            page = fetcher.get(url, stealthy_headers=True, timeout=15)
            if hasattr(page, "json") and callable(page.json):
                return page.json()
            elif hasattr(page, "body") and page.body:
                return json.loads(page.body.decode("utf-8", errors="replace"))
            return json.loads(page.text)
        except Exception as e:
            print(f"[Scrapling Fetcher Fallback] JSON fetch error for {url}: {e}")

    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36"}
    r = requests.get(url, headers=headers, timeout=15)
    r.raise_for_status()
    return r.json()


def smart_get_text(url: str) -> str:
    """Uses Scrapling's TLS spoofing to fetch raw XML/HTML text."""
    if HAS_SCRAPLING:
        try:
            fetcher = Fetcher()
            page = fetcher.get(url, stealthy_headers=True, timeout=15)
            if hasattr(page, "body") and page.body:
                return page.body.decode("utf-8", errors="replace")
            return page.text if hasattr(page, "text") and page.text else ""
        except Exception as e:
            print(f"[Scrapling Fetcher Fallback] Text fetch error for {url}: {e}")

    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36"}
    r = requests.get(url, headers=headers, timeout=15)
    r.raise_for_status()
    return r.text


def fetch_ffs_and_injury_web_intel() -> list[dict]:
    """Uses Scrapling's adaptive HTML parser to scrape FantasyFootballScout Team News & Pressers."""
    if not HAS_SCRAPLING:
        return []
    intel = []
    try:
        fetcher = Fetcher()
        page = fetcher.get("https://www.fantasyfootballscout.co.uk/team-news/", stealthy_headers=True, timeout=15)
        # Extract headlines and article summaries from FFS Team News hub
        articles = page.css("article, .post, .entry-content, h2, h3, p")
        extracted_chunks = []
        for el in articles[:35]:
            txt = el.text.strip() if hasattr(el, "text") and el.text else ""
            if len(txt) > 45 and any(k in txt.lower() for k in ["injur", "doubt", "fit", "start", "train", "press", "out", "expected"]):
                extracted_chunks.append(re.sub(r"\s+", " ", txt)[:400])
        if extracted_chunks:
            intel.append({
                "source": "FantasyFootballScout Team News Wire (Scrapling)",
                "highlights": extracted_chunks[:12],
            })
    except Exception as e:
        print(f"[Scrapling Web Intel Warn] FFS scrape skipped: {e}")
    return intel


def get_embedding(text: str, task_type: str = "retrieval_document") -> list[float]:
    """Generates a 768-dim vector embedding via Gemini API."""
    candidate_models = [
        "models/text-embedding-004",
        "models/gemini-embedding-001",
        "models/embedding-001",
    ]
    for model_name in candidate_models:
        try:
            res = genai.embed_content(
                model=model_name,
                content=text,
                task_type=task_type,
                output_dimensionality=768,
            )
            emb = res.get("embedding")
            if emb and len(emb) == 768:
                return emb
        except Exception:
            try:
                res = genai.embed_content(model=model_name, content=text, task_type=task_type)
                emb = res.get("embedding")
                if emb:
                    return (emb + [0.0] * 768)[:768]
            except Exception:
                continue
    return [0.0] * 768


def fetch_fpl_official_medical_and_sota() -> tuple[list[dict], list[dict], int]:
    """Pulls live FPL injury/presser flags and intersects with SOTA Poisson projections."""
    boot = smart_get_json("https://fantasy.premierleague.com/api/bootstrap-static/")

    events = boot.get("events", [])
    next_ev = next((e for e in events if e.get("is_next")), None)
    curr_ev = next((e for e in events if e.get("is_current")), None)
    target_gw = next_ev["id"] if next_ev else (curr_ev["id"] if curr_ev else 1)

    teams = {t["id"]: t["short_name"] for t in boot.get("teams", [])}

    sota_map = {}
    if SOTA_PATH.exists():
        try:
            with open(SOTA_PATH, "r", encoding="utf-8") as f:
                for row in json.load(f):
                    sota_map[int(row["player_id"])] = row
        except Exception:
            pass

    medical_alerts = []
    player_catalog = []

    for el in boot.get("elements", []):
        p_id = int(el["id"])
        web_name = el.get("web_name", "")
        team_short = teams.get(el.get("team"), "UNK")
        ownership = float(el.get("selected_by_percent") or 0.0)
        news_str = (el.get("news") or "").strip()
        chance = el.get("chance_of_playing_next_round")
        status = el.get("status", "a")
        transfers_in_gw = int(el.get("transfers_in_event") or 0)
        transfers_out_gw = int(el.get("transfers_out_event") or 0)

        sota = sota_map.get(p_id, {})
        xp = float(sota.get("projected_points") or el.get("ep_next") or 0.0)
        ceiling = float(sota.get("ceiling_points") or round(xp * 1.9, 1))
        haul_prob = float(sota.get("haul_prob") or 0.0)
        start_prob = float(sota.get("start_prob") or (1.0 if status == "a" else 0.0))

        player_catalog.append({
            "player_id": p_id,
            "web_name": web_name,
            "full_name": f"{el.get('first_name', '')} {el.get('second_name', '')}".strip(),
            "team": team_short,
            "cost": round(float(el.get("now_cost", 50)) / 10.0, 1),
            "ownership": ownership,
            "transfers_in_gw": transfers_in_gw,
            "transfers_out_gw": transfers_out_gw,
            "xp": xp,
            "ceiling": ceiling,
            "haul_prob": haul_prob,
            "start_prob": start_prob,
            "news": news_str,
            "chance": chance,
            "status": status,
        })

        if news_str and (ownership >= 1.5 or xp >= 3.2 or transfers_out_gw >= 15000):
            chance_label = f"{chance}% chance of playing" if chance is not None else f"status={status}"
            medical_alerts.append({
                "player_id": p_id,
                "player_web_name": web_name,
                "team": team_short,
                "news_text": (
                    f"[Official FPL Medical & Presser Flag] {web_name} ({team_short}, £{float(el.get('now_cost', 50))/10:.1f}m, "
                    f"{ownership}% owned): {news_str} ({chance_label}). "
                    f"Touchline SOTA Projection: {xp:.2f} xP | Ceiling: {ceiling:.1f} | Start Prob: {start_prob*100:.0f}%."
                ),
                "source": "Official Premier League Medical & Presser Wire",
            })

    medical_alerts.sort(key=lambda x: x["news_text"], reverse=True)
    return medical_alerts[:30], player_catalog, target_gw


def fetch_reddit_fantasypl_threads() -> list[dict]:
    """Scrapes r/FantasyPL hot and new feeds using Scrapling's TLS fingerprint spoofing."""
    posts = []
    seen_ids = set()
    urls = [
        "https://www.reddit.com/r/FantasyPL/hot.json?limit=30",
        "https://www.reddit.com/r/FantasyPL/new.json?limit=20",
    ]
    for url in urls:
        try:
            payload = smart_get_json(url)
            children = payload.get("data", {}).get("children", [])
            for child in children:
                data = child.get("data", {})
                post_id = data.get("id")
                if not post_id or post_id in seen_ids or (data.get("stickied") and "rant" in (data.get("title") or "").lower()):
                    continue
                seen_ids.add(post_id)
                title = (data.get("title") or "").strip()
                selftext = (data.get("selftext") or "").strip()
                score = int(data.get("score") or 0)
                flair = (data.get("link_flair_text") or "Discussion").strip()

                if score < 5 and "press" not in title.lower() and "leak" not in title.lower():
                    continue

                snippet = re.sub(r"\s+", " ", selftext)[:900]
                posts.append({
                    "title": title,
                    "flair": flair,
                    "upvotes": score,
                    "body": snippet,
                })
        except Exception as e:
            print(f"[Reddit Warn] Failed fetching {url}: {e}")

    posts.sort(key=lambda x: x["upvotes"], reverse=True)
    return posts[:25]


def fetch_youtube_creator_summaries() -> list[dict]:
    """Fetches latest videos from top FPL YouTube creators via RSS + optional transcript API."""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        has_transcript_pkg = True
    except ImportError:
        has_transcript_pkg = False

    creator_notes = []
    ns = {
        "yt": "http://www.youtube.com/xml/schemas/youtube/2015",
        "media": "http://search.yahoo.com/mrss/",
        "atom": "http://www.w3.org/2005/Atom",
    }

    for channel_name, channel_id in FPL_YOUTUBE_CHANNELS.items():
        rss_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
        try:
            xml_text = smart_get_text(rss_url)
            if not xml_text:
                continue
            root = ET.fromstring(xml_text)
            entries = root.findall("atom:entry", ns)[:2]
            for entry in entries:
                title_el = entry.find("atom:title", ns)
                vid_el = entry.find("yt:videoId", ns)
                desc_el = entry.find("media:group/media:description", ns)

                title = title_el.text if title_el is not None else "FPL Update"
                video_id = vid_el.text if vid_el is not None else ""
                desc = (desc_el.text or "")[:600] if desc_el is not None else ""

                transcript_excerpt = ""
                if has_transcript_pkg and video_id:
                    try:
                        tr_list = YouTubeTranscriptApi.get_transcript(video_id, languages=["en", "en-GB"])
                        full_tr = " ".join(chunk["text"] for chunk in tr_list)
                        transcript_excerpt = re.sub(r"\s+", " ", full_tr)[:1500]
                    except Exception:
                        pass

                creator_notes.append({
                    "creator": channel_name,
                    "title": title,
                    "content": transcript_excerpt if transcript_excerpt else re.sub(r"\s+", " ", desc),
                })
        except Exception as e:
            print(f"[YouTube RSS Warn] {channel_name}: {e}")

    return creator_notes


def synthesize_war_room_digest(
    medical_alerts: list[dict],
    reddit_posts: list[dict],
    youtube_notes: list[dict],
    web_intel: list[dict],
    player_catalog: list[dict],
    target_gw: int,
) -> dict:
    """Uses Gemini Flash to synthesize community buzz vs SOTA math into a structured digest + player notes."""
    top_sota = sorted(player_catalog, key=lambda x: x["xp"], reverse=True)[:18]
    most_bought = sorted(player_catalog, key=lambda x: x["transfers_in_gw"], reverse=True)[:10]
    most_sold = sorted(player_catalog, key=lambda x: x["transfers_out_gw"], reverse=True)[:10]

    prompt = f"""
You are the Lead Tactical Intelligence Engine for Touchline AI ahead of Fantasy Premier League Gameweek {target_gw}.
Analyze the following live data streams:

1. TOP SOTA POISSON & MONTE CARLO PROJECTIONS (GW{target_gw}):
{json.dumps([{k: p[k] for k in ('web_name', 'team', 'cost', 'ownership', 'xp', 'ceiling', 'haul_prob', 'start_prob')} for p in top_sota], indent=2)}

2. MOST TRANSFERRED IN THIS GAMEWEEK (COMMUNITY BANDWAGONS):
{json.dumps([{k: p[k] for k in ('web_name', 'team', 'cost', 'transfers_in_gw', 'xp', 'haul_prob', 'start_prob')} for p in most_bought], indent=2)}

3. MOST TRANSFERRED OUT THIS GAMEWEEK:
{json.dumps([{k: p[k] for k in ('web_name', 'team', 'transfers_out_gw', 'xp', 'news')} for p in most_sold], indent=2)}

4. OFFICIAL PREMIER LEAGUE MEDICAL & PRESS CONFERENCE FLAGS:
{json.dumps(medical_alerts[:20], indent=2)}

5. LIVE r/FantasyPL THREADS & PRESSER MEGATHREADS:
{json.dumps(reddit_posts[:15], indent=2)}

6. TOP FPL YOUTUBE CREATOR UPDATES & FANTASYFOOTBALLSCOUT WEB INTEL:
{json.dumps({"youtube": youtube_notes[:8], "web_intel": web_intel}, indent=2)}

Return STRICTLY valid JSON (no markdown fences) matching this exact structure:
{{
  "gameweek": {target_gw},
  "executive_briefing": "3-sentence high-impact summary of GW{target_gw} deadline landscape.",
  "press_conference_radar": [
    "Bullet 1 with exact player name, club, manager quote/flag, and start %",
    "Bullet 2..."
  ],
  "creator_and_reddit_consensus": {{
    "top_buys": ["Player A (reason)", "Player B (reason)"],
    "top_sells": ["Player C (reason)"],
    "captaincy_poll_leader": "Player Name & community sentiment"
  }},
  "community_traps_vs_sota_math": [
    "Identify 2-3 heavily bought bandwagon players whose SOTA xP/Haul% is mediocre, and name the superior SOTA mathematical alternative."
  ],
  "shield_vs_sword_captaincy": {{
    "shield": "Safe high-EO template captain with exact SOTA xP and Ceiling",
    "sword": "Explosive lower-EO differential captain with high p90 Ceiling and Haul %"
  }},
  "player_specific_intel": [
    {{
      "player_web_name": "Exact web_name from catalog",
      "news_text": "Detailed tactical + medical + community + SOTA xP summary for this player",
      "source": "GW{target_gw} War Room Synthesis (Presser + Reddit + SOTA)"
    }}
  ]
}}
Include 12 to 18 key players in `player_specific_intel`.
"""

    candidate_models = ["gemini-3.8-flash", "gemini-3-flash-preview", "gemini-flash-latest"]
    for model_name in candidate_models:
        try:
            model = genai.GenerativeModel(model_name)
            resp = model.generate_content(prompt)
            raw_text = (resp.text or "").strip()
            raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
            raw_text = re.sub(r"\s*```$", "", raw_text)
            return json.loads(raw_text)
        except Exception as e:
            print(f"[Gemini Synthesis Fallback] {model_name} failed: {e}")

    return {
        "gameweek": target_gw,
        "executive_briefing": f"GW{target_gw} War Room active. Top SOTA projection: {top_sota[0]['web_name']} ({top_sota[0]['xp']} xP, {top_sota[0]['haul_prob']*100:.1f}% Haul Prob).",
        "press_conference_radar": [m["news_text"] for m in medical_alerts[:6]],
        "creator_and_reddit_consensus": {
            "top_buys": [f"{p['web_name']} ({p['team']}) - {p['transfers_in_gw']} transfers in, {p['xp']} xP" for p in most_bought[:4]],
            "top_sells": [f"{p['web_name']} ({p['team']}) - {p['transfers_out_gw']} transfers out" for p in most_sold[:4]],
            "captaincy_poll_leader": f"{top_sota[0]['web_name']} ({top_sota[0]['xp']} xP)",
        },
        "community_traps_vs_sota_math": [
            f"Compare top bandwagon {most_bought[0]['web_name']} ({most_bought[0]['xp']} xP) against SOTA leader {top_sota[0]['web_name']} ({top_sota[0]['xp']} xP, {top_sota[0]['ceiling']} Ceiling)."
        ],
        "shield_vs_sword_captaincy": {
            "shield": f"{top_sota[0]['web_name']} ({top_sota[0]['xp']} xP | {top_sota[0]['ownership']}% EO)",
            "sword": f"{top_sota[1]['web_name']} ({top_sota[1]['xp']} xP | {top_sota[1]['ceiling']} p90 Ceiling | {top_sota[1]['haul_prob']*100:.1f}% Haul)",
        },
        "player_specific_intel": [
            {
                "player_web_name": p["web_name"],
                "news_text": (
                    f"{p['web_name']} ({p['team']}, £{p['cost']}m, {p['ownership']}% owned): "
                    f"SOTA projection {p['xp']} xP, p90 ceiling {p['ceiling']}, haul probability {p['haul_prob']*100:.1f}%, "
                    f"expected start {p['start_prob']*100:.0f}%. "
                    + (f"Medical note: {p['news']}" if p.get('news') else "No injury flags reported.")
                ),
                "source": f"GW{target_gw} SOTA Tactical Synthesis",
            }
            for p in top_sota[:14]
        ],
    }


def ingest_news():
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")

    if not gemini_key:
        raise ValueError("Missing GEMINI_API_KEY in environment variables.")

    genai.configure(api_key=gemini_key)
    supabase: Client = None
    if supabase_url and supabase_key:
        try:
            supabase = create_client(supabase_url, supabase_key)
        except Exception as e:
            print(f"[!] Supabase client init warning: {e}")

    print(f"1. Fetching official FPL medical flags & SOTA predictions (Scrapling active={HAS_SCRAPLING})...")
    medical_alerts, player_catalog, target_gw = fetch_fpl_official_medical_and_sota()

    print("2. Scraping live r/FantasyPL hot & new intelligence threads...")
    reddit_posts = fetch_reddit_fantasypl_threads()

    print("3. Fetching top FPL YouTube creator RSS feeds & transcripts...")
    youtube_notes = fetch_youtube_creator_summaries()

    print("4. Scraping FantasyFootballScout Team News via Scrapling adaptive parser...")
    web_intel = fetch_ffs_and_injury_web_intel()

    print("5. Synthesizing GW Deadline War Room Digest via Gemini...")
    digest = synthesize_war_room_digest(medical_alerts, reddit_posts, youtube_notes, web_intel, player_catalog, target_gw)

    DIGEST_OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(DIGEST_OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(digest, f, indent=2)
    print(f"Saved local digest to {DIGEST_OUT_PATH}")

    name_to_id = {}
    if supabase:
        try:
            p_res = supabase.table("players").select("id, web_name").execute()
            name_to_id = {row["web_name"].lower(): int(row["id"]) for row in (p_res.data or []) if row.get("web_name")}
        except Exception as e:
            print(f"[!] Supabase players lookup skipped ({e}), falling back to catalog...")
    if not name_to_id:
        name_to_id = {p["web_name"].lower(): int(p["player_id"]) for p in player_catalog if p.get("web_name")}

    records_to_insert = []
    now_iso = datetime.now(timezone.utc).isoformat()

    master_text = json.dumps({
        "gameweek": digest.get("gameweek"),
        "executive_briefing": digest.get("executive_briefing"),
        "press_conference_radar": digest.get("press_conference_radar"),
        "creator_and_reddit_consensus": digest.get("creator_and_reddit_consensus"),
        "community_traps_vs_sota_math": digest.get("community_traps_vs_sota_math"),
        "shield_vs_sword_captaincy": digest.get("shield_vs_sword_captaincy"),
    })
    records_to_insert.append({
        "player_id": None,
        "news_text": master_text,
        "source": "GW_WAR_ROOM_DIGEST",
        "published_at": now_iso,
        "embedding": get_embedding(master_text, task_type="retrieval_document"),
    })

    seen_players = set()
    for item in digest.get("player_specific_intel", []) + medical_alerts[:18]:
        w_name = (item.get("player_web_name") or "").strip()
        p_id = item.get("player_id") or name_to_id.get(w_name.lower())
        if not p_id or p_id in seen_players:
            continue
        seen_players.add(p_id)
        text = item["news_text"]
        records_to_insert.append({
            "player_id": int(p_id),
            "news_text": text,
            "source": item.get("source", "Touchline AI Intelligence Wire"),
            "published_at": now_iso,
            "embedding": get_embedding(text, task_type="retrieval_document"),
        })

    if supabase:
        try:
            print(f"6. Refreshing Supabase `team_news` table with {len(records_to_insert)} live intelligence vectors...")
            supabase.table("team_news").delete().neq("id", 0).execute()
            chunk_size = 50
            for i in range(0, len(records_to_insert), chunk_size):
                supabase.table("team_news").insert(records_to_insert[i : i + chunk_size]).execute()
            print("✅ Live FPL War Room Intelligence Ingestion Complete!")
        except Exception as err:
            print(f"[!] Warning: Supabase team_news upload skipped ({err}). SOTA Digest is saved locally to {DIGEST_OUT_PATH}")
    else:
        print(f"[*] SOTA Digest saved locally to {DIGEST_OUT_PATH}")


if __name__ == "__main__":
    ingest_news()
