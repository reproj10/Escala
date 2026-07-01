import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jlbvxaqayacohbwcxmal.supabase.co';
const SUPABASE_KEY = 'sb_publishable_OnO2olIDEzYe7whUS_1rMg_DoMl2COx';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
