# 🎞️ Presentation

`../Kids-Explorer-AI.pptx` — 20-slide deck covering the ecosystem, every kid feature, the admin panel, AdMob/Families compliance, architecture and quality. Speaker notes on the first slide.

Regenerate after UI changes:

```bash
pip install python-pptx pillow
# 1) Android screens (real Flutter rendering, no device needed)
cd mobile && flutter test --tags screenshots --run-skipped --update-goldens && cd ..
# 2) Website/admin screens: put PNG/JPG captures in docs/presentation/screens/ (names used in build_deck.py,
#    e.g. web-home, web-story, web-buddy, admin-dashboard …) — any browser screenshot tool works.
# 3) Build
python docs/presentation/build_deck.py
```
