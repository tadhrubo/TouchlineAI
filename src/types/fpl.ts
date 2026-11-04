export interface WarRoomDigest {
  gameweek: number;
  executive_briefing: string;
  press_conference_radar: string[];
  creator_and_reddit_consensus: {
    top_buys: string[];
    top_sells: string[];
    captaincy_poll_leader: string;
  };
  community_traps_vs_sota_math: string[];
  shield_vs_sword_captaincy: {
    shield: string;
    sword: string;
  };
  player_specific_intel?: Array<{
    player_web_name: string;
    news_text: string;
    source: string;
  }>;
}

export type Position = "GKP" | "DEF" | "MID" | "FWD";

export interface FixtureInfo {
  opponent: string;
  isHome: boolean;
  difficulty: 2 | 3 | 4 | 5; // FDR (Fixture Difficulty Rating)
  gameweek: number;
}

export interface PlayerLiveStats {
  goals_scored?: number;
  assists?: number;
  clean_sheets?: number;
  goals_conceded?: number;
  own_goals?: number;
  bonus?: number;
  bps?: number;
  yellow_cards?: number;
  red_cards?: number;
  saves?: number;
  minutes?: number;
  total_points?: number;
}

export interface Player {
  id: string;
  name: string;
  webName: string;
  fullName: string;
  team: string;
  teamShort: string;
  teamColor: string;
  teamSecondaryColor: string;
  teamPattern?: "stripes" | "sleeves" | "solid" | "halves";
  position: Position;
  price: number; // in millions, e.g. 15.2
  selectedByPercent: number;
  totalPoints: number;
  gameweekPoints: number;
  gw_points?: number;
  live_points?: number;
  projectedPoints: number;
  ceilingPoints?: number;
  haulProb?: number;
  form: number;
  xG: number;
  xA: number;
  xGI: number;
  xGC?: number;
  minutesExpected: number;
  startProbability: number; // 0-100
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  isBench?: boolean;
  benchOrder?: number; // 0 for sub GK, 1, 2, 3 for outfield
  status: "available" | "injured" | "doubtful" | "suspended" | "unavailable";
  sellingPrice?: number;
  purchasePrice?: number;
  news?: string;
  chanceOfPlaying?: number | null;
  currentFixture: FixtureInfo;
  upcomingFixtures: FixtureInfo[];
  photoUrl: string;
  top10kEo?: number;
  top_10k_eo?: number;
  teamCode?: number;
  team_code?: number;
  elementType?: number;
  element_type?: number;
  kitUrl?: string;
  stats?: PlayerLiveStats;
  liveStats?: PlayerLiveStats;
  multiplier?: number;
  matchFinished?: boolean;
  matchStarted?: boolean;
  yetToPlay?: boolean;
  isSubbedIn?: boolean;
  isSubbedOut?: boolean;
}

export interface LiveDashboardData {
  gw_rank?: number;
  live_rank?: number;
  old_rank?: number;
  live_points?: number;
  safety_score?: number;
  rank_delta?: number;
  rank_percent_change?: number;
}

export interface TeamStats {
  managerName: string;
  teamName: string;
  currentGameweek: number;
  nextGameweek: number;
  overallPoints: number;
  gameweekPoints: number;
  overallRank: number;
  overallRankPercentile: number;
  gameweekRank: number;
  teamValue: number;
  inTheBank: number;
  sellingValue?: number;
  liquidationBudget?: number;
  chipsUsed?: { name: string; event: number; time: string }[];
  freeTransfers: number;
  ft_available?: number;
  ftAvailable?: number;
  ft_left?: number;
  ftLeft?: number;
  activeChip?: "Wildcard" | "Free Hit" | "Bench Boost" | "Triple Captain" | null;
  formation: string; // e.g. "3-4-3"
  deadline: string;
  projectedGWPoints: number;
  liveRank?: number;
  oldRank?: number;
  rankDelta?: number;
  rankPercentChange?: number;
  livePoints?: number;
  safetyScore?: number;
  liveData?: LiveDashboardData;
}

export interface SquadData {
  stats: TeamStats;
  players: Player[];
  captainId: string;
  viceCaptainId: string;
  formation: string;
  sellingValue: number;
  liquidationBudget: number;
  chipsUsed: { name: string; event: number; time: string }[];
  ft_available?: number;
  ftAvailable?: number;
}

export interface NewsItem {
  id: string;
  player: string;
  team: string;
  type: "injury" | "rotation" | "price" | "tactical";
  severity: "danger" | "warning" | "success" | "info"; // red, yellow, green, blue
  headline: string;
  detail: string;
  timeAgo: string;
}

export interface InsightItem {
  id: string;
  type: "captaincy" | "rotation" | "injury" | "transfer";
  severity: "danger" | "warning" | "success";
  badge: string;
  title: string;
  summary: string;
  expandedDetail: string;
  actionText?: string;
  actionPayload?: string;
}

export interface ActionPill {
  id: string;
  label: string;
  iconName: string;
  promptText: string;
}

export interface ComparisonPlayer {
  id: string;
  name: string;
  team: string;
  price: string;
  photoUrl: string;
  projectedPoints: number;
  ceilingPoints?: number;
  haulProb?: number;
  startProbability: number;
  xGI: number;
  form: number;
  fixture: string;
  fdr: 2 | 3 | 4 | 5;
  selectedBy: string;
  advantages: string[];
}

export interface PlayerComparisonData {
  playerA: ComparisonPlayer;
  playerB: ComparisonPlayer;
  verdict: {
    recommendedPlayerId: string;
    headline: string;
    summary: string;
    reasons: string[];
    confidence: number; // 0-100
  };
}

export type ChipType = "WC1" | "WC2" | "FH" | "BB" | "TC";

export interface ChipStatus {
  available: boolean;
  usedEvent?: number;
  usedPoints?: number;
}

export interface GameweekStrategy {
  gameweek: number;
  status: "completed" | "active" | "upcoming";
  deadline: string;
  isDGW: boolean;
  isBGW: boolean;
  dgwTeams?: string[];
  bgwTeams?: string[];
  recommendedChip: ChipType | null;
  chipName: string | null;
  chipBadge: string | null;
  usedChip: string | null;
  expectedValueDelta: string | null;
  expectedNetXP: number;
  rationale: string;
  keyMatchups: string[];
}

export interface ChipStrategyResponse {
  entryId: string;
  managerName: string;
  teamName: string;
  currentGameweek: number;
  chipsStatus: {
    wildcard1: ChipStatus;
    wildcard2: ChipStatus;
    freehit: ChipStatus;
    benchBoost: ChipStatus;
    tripleCaptain: ChipStatus;
  };
  totalProjectedStrategyGain: string;
  recommendedCount: number;
  timeline: GameweekStrategy[];
}

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  timestamp: string;
  text?: string;
  comparisonCard?: PlayerComparisonData;
  quickActions?: { label: string; action: string }[];
  isThinking?: boolean;
}
