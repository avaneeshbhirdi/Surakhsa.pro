const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
async function test() {
  const { data, error } = await supabase.from('events').select('id, name, zones(count), alerts(count)').limit(1)
  console.log(JSON.stringify(data, null, 2))
  console.log("Error:", error)
}
test()
