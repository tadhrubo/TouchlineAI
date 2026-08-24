import os
import sys
import logging
from pathlib import Path
import requests
from dotenv import load_dotenv
from supabase import create_client, Client

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("fpl_ingestion")

# Locate and load environment variables from .env.local or .env
current_dir = Path(__file__).resolve().parent
repo_root = current_dir.parent.parent

env_paths = [
    repo_root / ".env.local",
    repo_root / ".env",
    current_dir.parent / ".env.local",
    current_dir / ".env.local",
]

env_loaded = False
for env_file in env_paths:
    if env_file.exists():
        load_dotenv(dotenv_path=env_file)
        logger.info(f"Loaded environment variables from: {env_file}")
        env_loaded = True
        break

if not env_loaded:
    load_dotenv()
    logger.info("Loaded environment variables from default system environment.")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL:
    logger.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL in environment!")
    sys.exit(1)

if not SUPABASE_SERVICE_ROLE_KEY:
    logger.error("Missing SUPABASE_SERVICE_ROLE_KEY in environment!")
    sys.exit(1)

FPL_BOOTSTRAP_URL = "https://fantasy.premierleague.com/api/bootstrap-static/"


def safe_int(value, default: int = 0) -> int:
    """Safely convert value to integer, handling None or invalid strings."""
    if value is None:
        return default
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


def safe_str(value, default: str = "") -> str:
    """Safely convert value to string, handling None."""
    if value is None:
        return default
    return str(value).strip()


def fetch_fpl_bootstrap() -> dict:
    """Fetch bootstrap-static payload from official Premier League FPL API."""
    logger.info(f"Fetching FPL bootstrap static data from: {FPL_BOOTSTRAP_URL}")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
    }
    try:
        response = requests.get(FPL_BOOTSTRAP_URL, headers=headers, timeout=20)
        response.raise_for_status()
        data = response.json()
        logger.info(
            f"Successfully downloaded FPL payload: {len(data.get('teams', []))} teams, {len(data.get('elements', []))} players."
        )
        return data
    except requests.RequestException as e:
        logger.error(f"Failed to fetch FPL API data: {e}")
        sys.exit(1)


def ingest_data():
    """Parse and upsert teams and players into Supabase tables."""
    # 1. Initialize Supabase Client with Service Role Key
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    logger.info("Connected to Supabase client using service role privileges.")

    # 2. Fetch raw bootstrap data
    raw_data = fetch_fpl_bootstrap()

    # 3. Parse Teams
    raw_teams = raw_data.get("teams", [])
    teams_to_upsert = []
    for t in raw_teams:
        teams_to_upsert.append(
            {
                "id": safe_int(t.get("id")),
                "name": safe_str(t.get("name")),
                "short_name": safe_str(t.get("short_name")),
                "strength": safe_int(t.get("strength"), 0),
            }
        )

    logger.info(f"Upserting {len(teams_to_upsert)} teams into 'teams' table...")
    try:
        team_res = supabase.table("teams").upsert(teams_to_upsert).execute()
        logger.info(f"✅ Successfully upserted {len(team_res.data)} teams.")
    except Exception as e:
        logger.error(f"Error upserting teams: {e}")
        sys.exit(1)

    # 4. Parse Players (Elements)
    raw_elements = raw_data.get("elements", [])
    players_to_upsert = []
    for el in raw_elements:
        players_to_upsert.append(
            {
                "id": safe_int(el.get("id")),
                "first_name": safe_str(el.get("first_name")),
                "second_name": safe_str(el.get("second_name")),
                "web_name": safe_str(el.get("web_name")),
                "team_id": safe_int(el.get("team")),
                "element_type": safe_int(el.get("element_type")),
                "now_cost": safe_int(el.get("now_cost"), 0),
                "selected_by_percent": safe_str(el.get("selected_by_percent"), "0.0"),
                "total_points": safe_int(el.get("total_points"), 0),
            }
        )

    # Upsert players in batches of 150 for efficiency
    batch_size = 150
    total_players = len(players_to_upsert)
    logger.info(
        f"Upserting {total_players} players into 'players' table in batches of {batch_size}..."
    )

    total_upserted = 0
    for i in range(0, total_players, batch_size):
        batch = players_to_upsert[i : i + batch_size]
        try:
            player_res = supabase.table("players").upsert(batch).execute()
            total_upserted += len(player_res.data)
            logger.info(
                f"  -> Batch {i // batch_size + 1}: Upserted {len(player_res.data)} players ({total_upserted}/{total_players})"
            )
        except Exception as e:
            logger.error(f"Error upserting player batch starting at index {i}: {e}")
            sys.exit(1)

    logger.info(
        f"\n🎉 Ingestion complete! Summary:\n   • Teams upserted: {len(teams_to_upsert)}\n   • Players upserted: {total_upserted}"
    )


if __name__ == "__main__":
    ingest_data()
