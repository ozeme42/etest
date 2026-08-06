
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://oocwiitwxrungkbevhry.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vY3dpaXR3eHJ1bmdrYmV2aHJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0Nzc0NzIsImV4cCI6MjEwMTA1MzQ3Mn0.HdO8o8rM2U6FkbR03NfAnL_bE3YRSzG8AXGefydqU-s';
const supabase = createClient(supabaseUrl, supabaseKey);

async function clean() {
  console.log('Fetching homeworks...');
  const { data: homeworks } = await supabase.from('homeworks').select('id');
  const hwIds = new Set(homeworks.map(h => h.id));
  
  console.log('Fetching submissions...');
  const { data: submissions } = await supabase.from('submissions').select('id, test_id');
  
  const toDelete = submissions.filter(s => !hwIds.has(s.test_id));
  console.log('Orphaned submissions found:', toDelete.length);
  
  if (toDelete.length > 0) {
    console.log('Deleting orphaned submissions...');
    for (const sub of toDelete) {
      await supabase.from('submissions').delete().eq('id', sub.id);
    }
    console.log('Done cleaning submissions.');
  }
}
clean();

