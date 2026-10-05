// Supabase Edge Function: optional cloud brain for the Talking Buddy.
// The apps ALWAYS run the free on-device engine first (safety filter, grammar,
// punctuation). This function only adds richer answers when the admin enables
// "Use cloud AI" in the Admin Panel.
//
// Deploy:  supabase functions deploy buddy --no-verify-jwt
// Secrets: supabase secrets set AI_API_KEY=...  AI_BASE_URL=...  AI_MODEL=...
//   - Google Gemini (free tier):  AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
//                                 AI_MODEL=gemini-2.0-flash
//   - OpenAI:                     AI_BASE_URL=https://api.openai.com/v1   AI_MODEL=gpt-4o-mini
//   - Any OpenAI-compatible server (Groq, OpenRouter, local Ollama, ...)

const BASE = Deno.env.get('AI_BASE_URL') ?? 'https://generativelanguage.googleapis.com/v1beta/openai';
const MODEL = Deno.env.get('AI_MODEL') ?? 'gemini-2.0-flash';
const KEY = Deno.env.get('AI_API_KEY') ?? '';
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '*').split(',');

const LANG_NAMES: Record<string, string> = { en: 'English', bn: 'Bangla (Bengali)', es: 'Spanish', fr: 'French', hi: 'Hindi' };

const SYSTEM = (lang: string, age: string, buddy: string) => `You are ${buddy}, a gentle, cheerful learning buddy for a child aged ${age || '4-8'}.
The child speaks ${LANG_NAMES[lang] ?? 'English'}. Always reply in that language.
Tasks:
1. Correct the child's sentence: grammar, polite/formal wording, capital letters and punctuation. Keep their meaning.
2. List short, kind tips (max 2) explaining the corrections in very simple words.
3. If the child used baby-talk or slang, give the formal word and a one-line meaning.
4. If it is a question, answer it in 1-2 short, true, age-appropriate sentences.
Safety rules: never ask for or repeat personal information (name, address, school, phone, photos).
Never discuss violence, weapons, romance, drugs, scary or adult topics; instead say it is a question for a trusted grown-up.
Never send the child to other websites or apps. Be encouraging. No emojis overload (max 1).
Respond ONLY with JSON: {"corrected": string, "tips": string[], "words": [{"from": string, "to": string, "meaning": string}], "answer": string}`;

function cors(origin: string | null) {
  const allow = ALLOWED_ORIGINS.includes('*') ? '*' : ALLOWED_ORIGINS.includes(origin ?? '') ? origin! : ALLOWED_ORIGINS[0];
  return { 'Access-Control-Allow-Origin': allow, 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
}

Deno.serve(async (req) => {
  const headers = { ...cors(req.headers.get('origin')), 'Content-Type': 'application/json' };
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return new Response('{}', { status: 405, headers });
  if (!KEY) return new Response(JSON.stringify({ error: 'AI_API_KEY not set' }), { status: 503, headers });

  let body: { text?: string; lang?: string; age?: string; buddy?: string };
  try {
    body = await req.json();
  } catch {
    return new Response('{}', { status: 400, headers });
  }
  const text = String(body.text ?? '').slice(0, 300).trim();
  if (!text) return new Response('{}', { status: 400, headers });
  const lang = String(body.lang ?? 'en').slice(0, 5);

  const res = await fetch(`${BASE.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: 'json_object' },
      // the child's name is deliberately NOT sent to the model
      messages: [
        { role: 'system', content: SYSTEM(lang, String(body.age ?? ''), String(body.buddy ?? 'Buddy').slice(0, 30)) },
        { role: 'user', content: text },
      ],
    }),
  });
  if (!res.ok) return new Response(JSON.stringify({ error: 'upstream' }), { status: 502, headers });
  const data = await res.json();
  try {
    const out = JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
    const clean = {
      corrected: String(out.corrected ?? '').slice(0, 400),
      tips: (Array.isArray(out.tips) ? out.tips : []).slice(0, 3).map((t: unknown) => String(t).slice(0, 200)),
      words: (Array.isArray(out.words) ? out.words : []).slice(0, 3).map((w: Record<string, unknown>) => ({
        from: String(w.from ?? '').slice(0, 40),
        to: String(w.to ?? '').slice(0, 40),
        meaning: String(w.meaning ?? '').slice(0, 160),
      })),
      answer: String(out.answer ?? '').slice(0, 500),
    };
    return new Response(JSON.stringify(clean), { headers });
  } catch {
    return new Response(JSON.stringify({ error: 'bad-json' }), { status: 502, headers });
  }
});
