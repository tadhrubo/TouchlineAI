const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8').split('\n');
const processEnv = {};
for (const line of env) {
    if (line.includes('=')) {
        const [k, ...v] = line.split('=');
        processEnv[k.trim()] = v.join('=').trim().replace(/['"]/g, '');
    }
}
const supabase = createClient(processEnv.NEXT_PUBLIC_SUPABASE_URL, processEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);
(async () => {
    const { data, error } = await supabase.from('players').select('id, web_name, player_predictions(*)').eq('web_name', 'Haaland');
    const sortedPreds = data[0].player_predictions?.sort((a, b) => (b.gw || 0) - (a.gw || 0));
    console.log(`[VERIFY] DB pred.projected_points (GW: ${sortedPreds[0]?.gw}):`, sortedPreds[0]?.projected_points);
})();
