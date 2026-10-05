import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from './store/AppContext.jsx';
import { Background, Modal } from './components/ui.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Home from './pages/Home.jsx';

const Alphabet = lazy(() => import('./pages/Alphabet.jsx'));
const Stories = lazy(() => import('./pages/Stories.jsx'));
const StoryReader = lazy(() => import('./pages/StoryReader.jsx'));
const Videos = lazy(() => import('./pages/Videos.jsx'));
const Games = lazy(() => import('./pages/Games.jsx'));
const Sudoku = lazy(() => import('./pages/games/Sudoku.jsx'));
const Memory = lazy(() => import('./pages/games/Memory.jsx'));
const Pattern = lazy(() => import('./pages/games/Pattern.jsx'));
const MathPop = lazy(() => import('./pages/games/MathPop.jsx'));
const OddOneOut = lazy(() => import('./pages/games/OddOneOut.jsx'));
const Explore = lazy(() => import('./pages/Explore.jsx'));
const Topic = lazy(() => import('./pages/Topic.jsx'));
const Quiz = lazy(() => import('./pages/Quiz.jsx'));
const Buddy = lazy(() => import('./pages/Buddy.jsx'));
const AiLab = lazy(() => import('./pages/AiLab.jsx'));
const Rewards = lazy(() => import('./pages/Rewards.jsx'));
const Parents = lazy(() => import('./pages/Parents.jsx'));

function Loading() {
  return (
    <div className="center" style={{ minHeight: '60vh', fontSize: '4rem' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}>
        🌀
      </motion.div>
    </div>
  );
}

/** Guard: features switched off in the Admin Panel redirect home. */
function Feature({ name, children }) {
  const { settings } = useApp();
  return settings.features?.[name] === false ? <Navigate to="/" replace /> : children;
}

export default function App() {
  const { profile, toast, timeUp, t } = useApp();
  const location = useLocation();
  const ready = profile.done;

  return (
    <>
      <Background />
      <div className="app">
        {!ready && location.pathname !== '/welcome' && <Navigate to="/welcome" replace />}
        <Suspense fallback={<Loading />}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/welcome" element={<Onboarding />} />
              <Route path="/" element={<Home />} />
              <Route path="/alphabet" element={<Feature name="alphabet"><Alphabet /></Feature>} />
              <Route path="/stories" element={<Feature name="stories"><Stories /></Feature>} />
              <Route path="/stories/:id" element={<Feature name="stories"><StoryReader /></Feature>} />
              <Route path="/videos" element={<Feature name="videos"><Videos /></Feature>} />
              <Route path="/games" element={<Feature name="games"><Games /></Feature>} />
              <Route path="/games/sudoku" element={<Feature name="games"><Sudoku /></Feature>} />
              <Route path="/games/memory" element={<Feature name="games"><Memory /></Feature>} />
              <Route path="/games/pattern" element={<Feature name="games"><Pattern /></Feature>} />
              <Route path="/games/math" element={<Feature name="games"><MathPop /></Feature>} />
              <Route path="/games/odd" element={<Feature name="games"><OddOneOut /></Feature>} />
              <Route path="/explore" element={<Feature name="explore"><Explore /></Feature>} />
              <Route path="/explore/:id" element={<Feature name="explore"><Topic /></Feature>} />
              <Route path="/quiz" element={<Feature name="quiz"><Quiz /></Feature>} />
              <Route path="/buddy" element={<Feature name="buddy"><Buddy /></Feature>} />
              <Route path="/ai-lab" element={<Feature name="ailab"><AiLab /></Feature>} />
              <Route path="/rewards" element={<Rewards />} />
              <Route path="/parents" element={<Parents />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div className="toast chip" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <Modal open={ready && timeUp && !location.pathname.startsWith('/parents')} onClose={() => {}}>
        <div className="center" style={{ gap: 12 }}>
          <div style={{ fontSize: '5rem' }}>😴</div>
          <h2>{t('timeUp')}</h2>
          <a className="btn ghost small" href="#/parents">
            👨‍👩‍👧 {t('parents')}
          </a>
        </div>
      </Modal>
    </>
  );
}
