// DEPRECATED — local-only build. Not imported by src/main.js.
// Retained for reference; pipeline never sends grievance text off-device.
// Use on-device src/llm.js (facts) + src/guard.js (safety) instead.
const FLAG_KEY = 'nyaya_setu_cloud_optin_v1';
let endpointOverride = null;

export function isCloudFallbackEnabled() {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            return localStorage.getItem(FLAG_KEY) === '1';
        }
    } catch { /* ignore */ }
    return false;
}

export function setCloudFallbackEnabled(on) {
    try { if (typeof window !== 'undefined' && window.localStorage) localStorage.setItem(FLAG_KEY, on ? '1' : '0'); } catch { /* ignore */ }
    return !!on;
}

export function setCloudEndpoint(url) {
    endpointOverride = url || null;
}

export function getCloudEndpoint() {
    if (endpointOverride) return endpointOverride;
    try {
        if (typeof window !== 'undefined' && window.__NYAYA_CLOUD_ENDPOINT) return window.__NYAYA_CLOUD_ENDPOINT;
    } catch { /* ignore */ }
    return null;
}

// Prototype: refines entity JSON via hosted Llama-3.1-8B-compatible endpoint.
// Throws if opt-in is off or no endpoint is configured — never silently exfiltrates.
export async function extractEntitiesViaCloud(narrative, fetchFn = fetch) {
    if (!isCloudFallbackEnabled()) throw new Error('Cloud fallback is OFF (opt-in required).');
    const endpoint = getCloudEndpoint();
    if (!endpoint) throw new Error('No cloud endpoint configured. Set window.__NYAYA_CLOUD_ENDPOINT.');
    const res = await fetchFn(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'llama-3.1-8b (hosted fallback, prototype)',
            messages: [
                { role: 'system', content: 'Extract factual JSON only: {"summary":"","aggressor":"unknown","date":"unknown","location":"unknown","category":"needs_human_review"}. Never invent section numbers.' },
                { role: 'user', content: String(narrative || '').slice(0, 1500) }
            ],
            temperature: 0.1,
            max_tokens: 300
        })
    });
    if (!res.ok) throw new Error(`Cloud HTTP ${res.status}`);
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content || '{}';
    const a = raw.indexOf('{');
    const b = raw.lastIndexOf('}');
    return JSON.parse(raw.slice(a, b + 1));
}
