// Google AdMob, configured for child-directed apps (Google Play Families policy / COPPA):
//  - tagForChildDirectedTreatment + under age of consent + G rating
//  - non-personalized ads only, AD_ID permission removed in AndroidManifest.xml
//  - every switch & unit id is controlled remotely from the Admin Panel
import 'package:flutter/material.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';

import '../models/content.dart';

const _testIds = {
  'banner': 'ca-app-pub-3940256099942544/6300978111',
  'interstitial': 'ca-app-pub-3940256099942544/1033173712',
  'rewarded': 'ca-app-pub-3940256099942544/5224354917',
};

class AdsService {
  AdsService._();
  static final AdsService instance = AdsService._();

  Json _cfg = {};
  bool _ready = false;
  int _activities = 0;
  InterstitialAd? _interstitial;

  bool get enabled => _cfg['enabled'] == true;
  bool get bannerOn => enabled && _cfg['banner'] == true;

  String _unit(String kind) {
    final id = '${_cfg['${kind}UnitId'] ?? ''}';
    return (_cfg['testMode'] != false || id.isEmpty) ? _testIds[kind]! : id;
  }

  AdRequest get request => const AdRequest(nonPersonalizedAds: true);

  Future<void> init(Json cfg) async {
    _cfg = cfg;
    if (!enabled || _ready) return;
    await MobileAds.instance.updateRequestConfiguration(
      RequestConfiguration(
        ageRestrictedTreatment: AgeRestrictedTreatment.child,
        maxAdContentRating: (_cfg['maxAdContentRating'] == 'PG') ? MaxAdContentRating.pg : MaxAdContentRating.g,
      ),
    );
    await MobileAds.instance.initialize();
    _ready = true;
    _loadInterstitial();
  }

  void updateConfig(Json cfg) {
    final wasEnabled = enabled;
    _cfg = cfg;
    if (enabled && !wasEnabled) init(cfg);
  }

  void _loadInterstitial() {
    if (!enabled || _cfg['interstitial'] != true) return;
    InterstitialAd.load(
      adUnitId: _unit('interstitial'),
      request: request,
      adLoadCallback: InterstitialAdLoadCallback(onAdLoaded: (ad) => _interstitial = ad, onAdFailedToLoad: (_) => _interstitial = null),
    );
  }

  /// Called after each finished activity; shows an interstitial every N activities.
  void onActivityFinished() {
    if (!enabled || _cfg['interstitial'] != true) return;
    _activities++;
    final every = ((_cfg['interstitialEveryN'] as num?)?.toInt() ?? 4).clamp(2, 50);
    if (_activities % every != 0 || _interstitial == null) return;
    _interstitial!.fullScreenContentCallback = FullScreenContentCallback(
      onAdDismissedFullScreenContent: (ad) {
        ad.dispose();
        _loadInterstitial();
      },
      onAdFailedToShowFullScreenContent: (ad, _) {
        ad.dispose();
        _loadInterstitial();
      },
    );
    _interstitial!.show();
    _interstitial = null;
  }

  /// Rewarded ad (only reachable behind the grown-up gate). Calls [onReward] when earned.
  void showRewarded(VoidCallback onReward, {VoidCallback? onUnavailable}) {
    if (!enabled || _cfg['rewarded'] != true) return onUnavailable?.call();
    RewardedAd.load(
      adUnitId: _unit('rewarded'),
      request: request,
      rewardedAdLoadCallback: RewardedAdLoadCallback(
        onAdLoaded: (ad) => ad.show(onUserEarnedReward: (_, _) => onReward()),
        onAdFailedToLoad: (_) => onUnavailable?.call(),
      ),
    );
  }

  String get bannerUnit => _unit('banner');
}

/// Banner shown only at the bottom of menu screens (never inside activities).
class BannerSlot extends StatefulWidget {
  const BannerSlot({super.key});
  @override
  State<BannerSlot> createState() => _BannerSlotState();
}

class _BannerSlotState extends State<BannerSlot> {
  BannerAd? _ad;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    final ads = AdsService.instance;
    if (!ads.bannerOn) return;
    _ad = BannerAd(
      adUnitId: ads.bannerUnit,
      size: AdSize.banner,
      request: ads.request,
      listener: BannerAdListener(onAdLoaded: (_) => setState(() => _loaded = true), onAdFailedToLoad: (ad, _) => ad.dispose()),
    )..load();
  }

  @override
  void dispose() {
    _ad?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_loaded || _ad == null) return const SizedBox.shrink();
    return SafeArea(
      top: false,
      child: SizedBox(
        height: _ad!.size.height.toDouble(),
        width: _ad!.size.width.toDouble(),
        child: AdWidget(ad: _ad!),
      ),
    );
  }
}
