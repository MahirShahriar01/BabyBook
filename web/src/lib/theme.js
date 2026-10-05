// Theme resolution honours the Admin Panel's "themeMode":
//   kid_choice  -> the theme the kid picked (falls back to gender preset)
//   gender_auto -> admin's gender -> theme mapping
//   forced      -> one global theme chosen by the admin
export function resolveTheme(settings, profile) {
  const themes = settings?.themes?.length ? settings.themes : [];
  const gender = profile?.gender || 'neutral';
  let id;
  if (settings.themeMode === 'forced') id = settings.forcedThemeId;
  else if (settings.themeMode === 'gender_auto') id = settings.genderThemes?.[gender];
  else id = profile?.themeId || settings.genderThemes?.[gender] || settings.defaultThemeId;
  return themes.find((t) => t.id === id) || themes.find((t) => t.id === settings.defaultThemeId) || themes[0];
}

export function recommendedThemeId(settings, gender) {
  return settings.genderThemes?.[gender || 'neutral'] || settings.defaultThemeId;
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

export function applyTheme(theme, fontFamily) {
  if (!theme) return;
  const r = document.documentElement;
  const vars = {
    '--primary': theme.primary,
    '--secondary': theme.secondary,
    '--accent': theme.accent,
    '--bg-from': theme.bgFrom,
    '--bg-to': theme.bgTo,
    '--surface': theme.surface,
    '--text': theme.text,
    '--primary-rgb': hexToRgb(theme.primary),
    '--secondary-rgb': hexToRgb(theme.secondary),
    '--surface-rgb': hexToRgb(theme.surface),
    '--font': `'${fontFamily || 'Baloo 2'}', 'Hind Siliguri', 'Noto Sans Devanagari', system-ui, sans-serif`,
  };
  for (const [k, v] of Object.entries(vars)) r.style.setProperty(k, v);
  r.dataset.dark = theme.dark ? 'true' : 'false';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.primary);
}
