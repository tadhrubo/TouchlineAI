import os
import sys
from datetime import datetime, timezone
from dotenv import load_dotenv
import google.generativeai as genai
from supabase import create_client, Client

# Ensure clean UTF-8 console output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(BASE_DIR))
ENV_PATH = os.path.join(PROJECT_ROOT, ".env.local")

load_dotenv(ENV_PATH)
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in .env.local")

genai.configure(api_key=GEMINI_API_KEY)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Realistic Premier League News Updates
NEWS_UPDATES = [
    {
        "player_web_name": "Saka",
        "news_text": "Bukayo Saka was substituted with a tight hamstring late in the second half, but Mikel Arteta confirmed in his post-match press conference that it was purely precautionary and expects him to be fit and start for the weekend fixture against Wolves.",
        "source": "Arsenal Pre-Match Press Conference",
    },
    {
        "player_web_name": "Haaland",
        "news_text": "Pep Guardiola confirmed Erling Haaland is in peak physical condition following light squad rotation in training, affirming he is primed to lead the attack as captain.",
        "source": "Man City Official Press Conference",
    },
    {
        "player_web_name": "Palmer",
        "news_text": "Enzo Maresca reported Cole Palmer completed all team training sessions without discomfort after a minor knock to his ankle, and will be in the starting XI for the London derby.",
        "source": "Chelsea Medical Briefing",
    },
    {
        "player_web_name": "B.Fernandes",
        "news_text": "Bruno Fernandes has zero fitness concerns and remains the confirmed penalty taker and tactical focal point in midfield for Manchester United.",
        "source": "Man Utd Media Centre",
    },
    {
        "player_web_name": "Isak",
        "news_text": "Eddie Howe noted Alexander Isak felt slight tightness in his groin during Thursday training, rating him as doubtful (75% probability) for the upcoming match.",
        "source": "Newcastle Press Conference",
    },
    {
        "player_web_name": "Watkins",
        "news_text": "Unai Emery confirmed Ollie Watkins is fully fit after managing minor knee soreness during international duty, and is set to start against Arsenal.",
        "source": "Aston Villa Press Conference",
    },
    {
        "player_web_name": "Calafiori",
        "news_text": "Riccardo Calafiori trained with the first team all week and Arteta indicated he is in contention for his full Premier League start at left back.",
        "source": "Arsenal Training Report",
    },
    {
        "player_web_name": "João Pedro",
        "news_text": "João Pedro was seen with ice on his thigh after the last match, and staff are assessing him ahead of matchday selection. Minor rotation risk.",
        "source": "Club Medical Update",
    },
]

def get_embedding(text: str, task_type: str = "retrieval_document"):
    """Generate 768-dimension embedding via Gemini API."""
    candidate_models = [
        "models/gemini-embedding-001",
        "models/gemini-embedding-2",
        "models/text-embedding-004",
    ]
    
    for m in candidate_models:
        try:
            res = genai.embed_content(
                model=m,
                content=text,
                task_type=task_type,
                output_dimensionality=768
            )
            return res["embedding"]
        except Exception:
            continue
            
    # Default direct call
    res = genai.embed_content(
        model="models/gemini-embedding-001",
        content=text,
        output_dimensionality=768
    )
    return res["embedding"]

def ingest_news():
    print("[*] Starting Touchline AI Vector Store News Ingestion (pgvector + Gemini 768d)...")
    
    # 1. Fetch player name mapping from Supabase
    p_res = supabase.table("players").select("id, web_name").execute()
    player_map = {p["web_name"].lower(): p["id"] for p in p_res.data}
    
    # Clear existing news for fresh ingest
    supabase.table("team_news").delete().neq("id", 0).execute()
    print("    -> Cleared previous team_news records.")
    
    records = []
    for item in NEWS_UPDATES:
        p_name = item["player_web_name"]
        p_id = player_map.get(p_name.lower())
        text = item["news_text"]
        source = item["source"]
        
        print(f"[*] Generating embedding for {p_name}: '{text[:60]}...'")
        try:
            embedding = get_embedding(text, task_type="retrieval_document")
            
            record = {
                "player_id": p_id,
                "news_text": text,
                "source": source,
                "published_at": datetime.now(timezone.utc).isoformat(),
                "embedding": embedding,
            }
            records.append(record)
        except Exception as e:
            print(f"[!] Error embedding news for {p_name}: {e}")
            
    # 2. Insert into Supabase team_news
    if records:
        print(f"[*] Inserting {len(records)} embedded news records into 'team_news'...")
        supabase.table("team_news").insert(records).execute()
        print("[+] Vector store ingestion complete!")
        
    # 3. Test vector similarity search RPC
    test_query = "Is Bukayo Saka fit to play or injured?"
    print(f"\n[*] Testing match_news RPC with query: '{test_query}'")
    query_vector = get_embedding(test_query, task_type="retrieval_query")
    
    rpc_res = supabase.rpc("match_news", {
        "query_embedding": query_vector,
        "match_threshold": 0.3,
        "match_count": 3
    }).execute()
    
    print("\n--- TOP MATCHING VECTOR NEWS RESULTS ---")
    for row in rpc_res.data:
        sim = round(row.get("similarity", 0) * 100, 1)
        print(f"• [{sim}% Similarity] Source: {row['source']}")
        print(f"  News: {row['news_text']}\n")

if __name__ == "__main__":
    ingest_news()
