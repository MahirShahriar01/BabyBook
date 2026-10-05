import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:youtube_player_iframe/youtube_player_iframe.dart';

import '../i18n.dart';
import '../models/content.dart';
import '../services/analytics.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';

class VideosScreen extends StatefulWidget {
  const VideosScreen({super.key});
  @override
  State<VideosScreen> createState() => _VideosScreenState();
}

class _VideosScreenState extends State<VideosScreen> {
  String cat = 'All';
  @override
  Widget build(BuildContext context) {
    final st = context.watch<AppState>();
    // only YouTube is embedded on Android (no outbound browser links for kids)
    final vids = st.content.videos.where((v) => v.youtubeId.isNotEmpty && forAge(v.ageGroups, st.profile.age)).toList();
    final cats = [
      'All',
      ...{
        for (final v in vids)
          if (v.category.isNotEmpty) v.category,
      },
    ];
    final list = cat == 'All' ? vids : vids.where((v) => v.category == cat).toList();
    final age = st.settings.ageGroups.where((g) => g.id == st.profile.age).firstOrNull;
    return KidScaffold(
      title: tr(st.profile.uiLang, 'videos'),
      emoji: '📺',
      banner: true,
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text('${age?.emoji ?? ''} Picked for ages ${age?.range ?? 'all'}', style: const TextStyle(fontWeight: FontWeight.w700)),
            ),
          ),
          SizedBox(
            height: 56,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
              children: [
                for (final c in cats)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: KidButton(label: c, ghost: c != cat, onTap: () => setState(() => cat = c)),
                  ),
              ],
            ),
          ),
          Expanded(
            child: list.isEmpty
                ? const Center(
                    child: Padding(
                      padding: EdgeInsets.all(24),
                      child: Text('No cartoons for this age yet 🎬', style: TextStyle(fontSize: 20)),
                    ),
                  )
                : GridView.builder(
                    padding: const EdgeInsets.all(14),
                    itemCount: list.length,
                    gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                      maxCrossAxisExtent: 360,
                      mainAxisSpacing: 14,
                      crossAxisSpacing: 14,
                      childAspectRatio: 1.25,
                    ),
                    itemBuilder: (_, i) {
                      final v = list[i];
                      return Bouncy(
                        onTap: () {
                          Analytics.instance.track('video_play', id: v.id, name: v.title);
                          go(context, VideoPlayerScreen(video: v));
                        },
                        child: GlassBox(
                          padding: const EdgeInsets.all(8),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(18),
                                  child: Stack(
                                    fit: StackFit.expand,
                                    children: [
                                      Image.network(
                                        v.thumb,
                                        fit: BoxFit.cover,
                                        errorBuilder: (_, _, _) => Container(color: colorAt(i)),
                                      ),
                                      const Center(child: Text('▶️', style: TextStyle(fontSize: 44))),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                v.title,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                              ),
                              Text(v.category, style: const TextStyle(fontSize: 12)),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

class VideoPlayerScreen extends StatefulWidget {
  const VideoPlayerScreen({super.key, required this.video});
  final Video video;
  @override
  State<VideoPlayerScreen> createState() => _VideoPlayerScreenState();
}

class _VideoPlayerScreenState extends State<VideoPlayerScreen> {
  late final YoutubePlayerController _c = YoutubePlayerController.fromVideoId(
    videoId: widget.video.youtubeId,
    autoPlay: true,
    params: const YoutubePlayerParams(
      showFullscreenButton: true,
      strictRelatedVideos: true, // related videos only from the same channel
      showVideoAnnotations: false,
      playsInline: true,
    ),
  );

  @override
  void dispose() {
    _c.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return KidScaffold(
      title: widget.video.title,
      emoji: '📺',
      body: ListView(
        padding: const EdgeInsets.all(14),
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(22),
            child: YoutubePlayer(controller: _c, aspectRatio: 16 / 9),
          ),
          const SizedBox(height: 16),
          Center(
            child: KidButton(
              label: '✅ Done watching',
              onTap: () {
                finishActivity(context, 'video', id: widget.video.id, name: widget.video.title, celebrate: false);
                Navigator.pop(context);
              },
            ),
          ),
        ],
      ),
    );
  }
}
