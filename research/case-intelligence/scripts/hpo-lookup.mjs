// Research helper: look up HP ids or search terms on the JAX ontology API.
// Usage: node scripts/hpo-lookup.mjs HP:0001252 "heat intolerance" ...
const API = 'https://ontology.jax.org/api/hp';
for (const arg of process.argv.slice(2)) {
  if (/^HP:\d{7}$/.test(arg)) {
    const res = await fetch(`${API}/terms/${encodeURIComponent(arg)}`, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) { console.log(`${arg} => HTTP ${res.status}`); continue; }
    const t = await res.json();
    const flag = t.id === arg ? '' : `  (RESOLVES TO ${t.id})`;
    console.log(`${arg} => ${t.name}${flag}`);
  } else {
    const res = await fetch(`${API}/search?q=${encodeURIComponent(arg)}&limit=4`, { signal: AbortSignal.timeout(20000) });
    const body = await res.json();
    const items = (body.terms ?? []).map((t) => `${t.id} ${t.name}`).join(' | ');
    console.log(`"${arg}" => ${items || 'no result'}`);
  }
}
