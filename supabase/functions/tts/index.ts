// Supabase Edge Function "tts": a free cloud voice for devices that have no voice for a
// language (very common for Bangla on desktop browsers and some Android phones).
//
// Uses Google Cloud Text-to-Speech (free tier: millions of characters per month) and
// caches every clip in the public "media" bucket, so each sentence is synthesised once.
//
// Deploy:  supabase functions deploy tts --no-verify-jwt
// Secrets: supabase secrets set GOOGLE_TTS_API_KEY=...   (Cloud console → APIs → Text-to-Speech → Credentials)
//          optional: TTS_VOICE_BN=bn-IN-Wavenet-A  ALLOWED_ORIGINS=https://your-site.com
// Request: POST { "text": "অ-তে অজগর", "lang": "bn" }  →  { "url": "https://…/media/tts/bn/<hash>.mp3" }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const KEY = Deno.env.get('GOOGLE_TTS_API_KEY') ?? '';
const ALLOWED = (Deno.env.get('ALLOWED_ORIGINS') ?? '*').split(',');
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

// Google voices per app language (Bangla is offered as bn-IN; it reads Bangladeshi text well).
const VOICES: Record<string, { languageCode: string; name?: string }> = {
  bn: { languageCode: 'bn-IN', name: Deno.env.get('TTS_VOICE_BN') ?? undefined },
  hi: { languageCode: 'hi-IN', name: Deno.env.get('TTS_VOICE_HI') ?? undefined },
  en: { languageCode: 'en-US', name: Deno.env.get('TTS_VOICE_EN') ?? undefined },
  es: { languageCode: 'es-ES' },
  fr: { languageCode: 'fr-FR' },
};

function cors(origin: string | null) {
  const allow = ALLOWED.includes('*') ? '*' : ALLOWED.includes(origin ?? '') ? origin! : ALLOWED[0];
  return { 'Access-Control-Allow-Origin': allow, 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
}

async function sha1(s: string) {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  const headers = { ...cors(req.headers.get('origin')), 'Content-Type': 'application/json' };
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return new Response('{}', { status: 405, headers });
  if (!KEY) return new Response(JSON.stringify({ error: 'GOOGLE_TTS_API_KEY not set' }), { status: 503, headers });

  let body: { text?: string; lang?: string };
  try {
    body = await req.json();
  } catch {
    return new Response('{}', { status: 400, headers });
  }
  const text = String(body.text ?? '').trim().slice(0, 500);
  const lang = VOICES[String(body.lang)] ? String(body.lang) : 'en';
  if (!text) return new Response('{}', { status: 400, headers });

  const voice = VOICES[lang];
  const path = `tts/${lang}/${await sha1(`${voice.languageCode}|${voice.name ?? ''}|${text}`)}.mp3`;
  const publicUrl = supabase.storage.from('media').getPublicUrl(path).data.publicUrl;

  // already synthesised?
  const head = await fetch(publicUrl, { method: 'HEAD' });
  if (head.ok) return new Response(JSON.stringify({ url: publicUrl }), { headers });

  const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { ...voice, ssmlGender: 'FEMALE' },
      // a little slower and brighter: easier for young children
      audioConfig: { audioEncoding: 'MP3', speakingRate: 0.9, pitch: 2 },
    }),
  });
  if (!res.ok) return new Response(JSON.stringify({ error: 'tts-upstream', status: res.status }), { status: 502, headers });
  const { audioContent } = await res.json();
  const bytes = Uint8Array.from(atob(audioContent), (c) => c.charCodeAt(0));
  const up = await supabase.storage.from('media').upload(path, bytes, { contentType: 'audio/mpeg', cacheControl: '31536000', upsert: true });
  if (up.error) return new Response(JSON.stringify({ error: up.error.message }), { status: 500, headers });
  return new Response(JSON.stringify({ url: publicUrl }), { headers });
});
