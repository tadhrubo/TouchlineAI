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
    const res = await supabase.from('players').select('id, web_name, player_predictions(*)').limit(5);
    console.log("Error:", res.error);
    console.log("Data:", res.data);
})();
