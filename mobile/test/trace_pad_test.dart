import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kids_explorer/widgets/trace_pad.dart';

void main() {
  setUpAll(() async {
    final l = FontLoader('Baloo2')..addFont(rootBundle.load('assets/fonts/Baloo2_800ExtraBold.ttf'));
    await l.load();
  });

  testWidgets('tracing inside a scrolling sheet draws instead of scrolling', (tester) async {
    tester.view.physicalSize = const Size(1080, 2160);
    tester.view.devicePixelRatio = 2.7;
    addTearDown(tester.view.reset);
    final scroll = ScrollController();
    var drawingEvents = <bool>[];
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: StatefulBuilder(builder: (context, setState) {
          final drawing = drawingEvents.isNotEmpty && drawingEvents.last;
          return ListView(
            controller: scroll,
            physics: drawing ? const NeverScrollableScrollPhysics() : null,
            children: [
              const SizedBox(height: 100),
              TracePad(char: 'I', color: Colors.pink, onDrawingChanged: (d) => setState(() => drawingEvents = [...drawingEvents, d])),
              const SizedBox(height: 2000),
            ],
          );
        }),
      ),
    ));
    await tester.pump();
    final pad = tester.getRect(find.byType(TracePad));
    // a long vertical stroke down the middle of the pad
    final g = await tester.startGesture(Offset(pad.center.dx, pad.top + 40));
    for (var i = 1; i <= 20; i++) {
      await g.moveBy(const Offset(0, 12));
      await tester.pump(const Duration(milliseconds: 16));
    }
    await g.up();
    await tester.pump();
    expect(scroll.offset, 0, reason: 'the list must not scroll while tracing');
    expect(drawingEvents, [true, false]);
  });

  testWidgets('tracing over the letter completes it; scribbling elsewhere does not', (tester) async {
    tester.view.physicalSize = const Size(1080, 2160);
    tester.view.devicePixelRatio = 2.7;
    addTearDown(tester.view.reset);
    var done = 0;
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: Center(child: SizedBox(width: 300, child: TracePad(char: 'I', color: Colors.pink, fontFamily: 'Baloo2', onDone: () => done++))))));
    await tester.pump();
    await tester.runAsync(() => Future.delayed(const Duration(milliseconds: 300))); // glyph mask renders
    await tester.pump();
    final pad = tester.getRect(find.byType(AspectRatio));

    Future<void> stroke(Offset from, Offset to) async {
      final g = await tester.startGesture(from);
      for (var i = 1; i <= 24; i++) {
        await g.moveTo(Offset.lerp(from, to, i / 24)!);
      }
      await g.up();
      await tester.pump();
    }

    // scribble in a corner: no completion
    await stroke(pad.topLeft + const Offset(10, 10), pad.topLeft + const Offset(40, 60));
    expect(done, 0);
    // clear, then trace the vertical bar of "I" from top to bottom
    await tester.tap(find.text('🧽'));
    await tester.pump();
    await stroke(Offset(pad.center.dx, pad.top + pad.height * 0.2), Offset(pad.center.dx, pad.top + pad.height * 0.85));
    expect(done, 1);
  });
}
