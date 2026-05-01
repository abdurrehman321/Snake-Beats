import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  RefreshCcw, 
  Trophy, 
  Music,
  Gamepad2,
  Zap
} from 'lucide-react';

// Constants
const GRID_SIZE = 20;
const INITIAL_SPEED = 150;
const MIN_SPEED = 50;
const SPEED_INCREMENT = 5;

// Types
type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

// Audio Context helper for sound effects
class SoundEngine {
  private ctx: AudioContext | null = null;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  playEat() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playGameOver() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(110, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(55, this.ctx.currentTime + 0.5);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }
}

const sounds = new SoundEngine();

export default function App() {
  // Game State
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  const [speed, setSpeed] = useState(INITIAL_SPEED);

  // Music State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playlist = [
    { title: "Neon Nights", artist: "Synth Corp", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    { title: "Cyber Drive", artist: "Data Ghost", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
    { title: "Retro Future", artist: "Pulse Wave", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
  ];

  // Logic: Random point
  const getRandomPoint = useCallback((): Point => ({
    x: Math.floor(Math.random() * GRID_SIZE),
    y: Math.floor(Math.random() * GRID_SIZE)
  }), []);

  // Logic: Game Loop
  const moveSnake = useCallback(() => {
    if (isGameOver || isPaused) return;

    setSnake(prevSnake => {
      const head = prevSnake[0];
      const newHead = { ...head };

      switch (direction) {
        case 'UP': newHead.y -= 1; break;
        case 'DOWN': newHead.y += 1; break;
        case 'LEFT': newHead.x -= 1; break;
        case 'RIGHT': newHead.x += 1; break;
      }

      // Wall collision
      if (
        newHead.x < 0 || newHead.x >= GRID_SIZE ||
        newHead.y < 0 || newHead.y >= GRID_SIZE
      ) {
        setIsGameOver(true);
        sounds.playGameOver();
        return prevSnake;
      }

      // Self collision
      if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        setIsGameOver(true);
        sounds.playGameOver();
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Food collision
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(s => s + 10);
        setFood(getRandomPoint());
        setSpeed(prev => Math.max(MIN_SPEED, INITIAL_SPEED - Math.floor(score / 50) * SPEED_INCREMENT));
        sounds.playEat();
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [direction, food, isGameOver, isPaused, getRandomPoint, score]);

  // Keyboard Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      sounds.init(); // Initialize audio context on first interaction
      switch (e.key) {
        case 'ArrowUp': if (direction !== 'DOWN') setDirection('UP'); break;
        case 'ArrowDown': if (direction !== 'UP') setDirection('DOWN'); break;
        case 'ArrowLeft': if (direction !== 'RIGHT') setDirection('LEFT'); break;
        case 'ArrowRight': if (direction !== 'LEFT') setDirection('RIGHT'); break;
        case ' ': setIsPaused(p => !p); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction]);

  // Game Interval
  useEffect(() => {
    const interval = setInterval(moveSnake, speed);
    return () => clearInterval(interval);
  }, [moveSnake, speed]);

  // High Score
  useEffect(() => {
    if (score > highScore) setHighScore(score);
  }, [score, highScore]);

  // Music Logic
  const togglePlay = () => setIsPlaying(!isPlaying);
  const nextTrack = () => setCurrentTrackIndex((currentTrackIndex + 1) % playlist.length);
  const prevTrack = () => setCurrentTrackIndex((currentTrackIndex - 1 + playlist.length) % playlist.length);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => setIsPlaying(false));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrackIndex]);

  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setFood(getRandomPoint());
    setDirection('RIGHT');
    setScore(0);
    setIsGameOver(false);
    setIsPaused(false);
    setSpeed(INITIAL_SPEED);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white font-sans flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-neon-cyan/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-neon-pink/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 mb-8 text-center">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter uppercase italic glow-cyan mb-2">
          Snake Beats
        </h1>
        <p className="text-neon-pink font-mono text-sm tracking-widest uppercase flex items-center justify-center gap-2">
          <Zap className="w-4 h-4" /> System Online <Zap className="w-4 h-4" />
        </p>
      </header>

      <main className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 w-full max-w-6xl">
        {/* Left Side: Stats */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-black/40 border border-neon-cyan/30 p-6 rounded-xl backdrop-blur-md border-glow-cyan">
            <h2 className="text-xs font-mono uppercase text-neon-cyan mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4" /> Telemetry
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-zinc-500 text-xs uppercase font-bold tracking-wider">Score</p>
                <p className="text-3xl font-mono">{score.toString().padStart(6, '0')}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs uppercase font-bold tracking-wider">High Score</p>
                <p className="text-xl font-mono text-neon-pink">{highScore.toString().padStart(6, '0')}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs uppercase font-bold tracking-wider">Speed (lvl)</p>
                <p className="text-xl font-mono text-neon-lime">{Math.floor((INITIAL_SPEED - speed + 10) / 10)}</p>
              </div>
            </div>
          </div>

          <div className="bg-black/40 border border-neon-pink/30 p-6 rounded-xl backdrop-blur-md border-glow-pink">
            <h2 className="text-xs font-mono uppercase text-neon-pink mb-4 flex items-center gap-2">
              <Gamepad2 className="w-4 h-4" /> Controls
            </h2>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-zinc-400">
              <div className="flex flex-col gap-1">
                <span className="text-neon-pink">ARROWS</span>
                <span>Steer Viper</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-neon-pink">SPACE</span>
                <span>Pause/Sys</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Game Board */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div className="relative w-full aspect-square max-w-[500px] border-4 border-neon-cyan/50 bg-[#050507] rounded-sm overflow-hidden shadow-[0_0_50px_rgba(0,255,255,0.15)] scanlines">
            <div className="absolute inset-0 crt-flicker pointer-events-none z-50 mix-blend-overlay" />
            
            {/* Grid Pattern Background */}
            <div className="absolute inset-0 grid grid-cols-20 grid-rows-20 pointer-events-none opacity-5">
              {Array.from({ length: 400 }).map((_, i) => (
                <div key={i} className="border-[0.5px] border-neon-cyan" />
              ))}
            </div>

            {/* Game Over Overlay */}
            <AnimatePresence>
              {isGameOver && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute inset-0 z-20 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm"
                >
                  <h2 className="text-4xl font-bold glow-pink mb-2 uppercase italic italic-small tracking-tighter">
                    Viper Offline
                  </h2>
                  <p className="text-neon-pink font-mono mb-8 animate-pulse">Critical System Failure</p>
                  <button 
                    onClick={resetGame}
                    className="group relative px-8 py-3 bg-neon-cyan text-black font-bold uppercase tracking-widest text-sm hover:scale-105 transition-transform"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <RefreshCcw className="w-4 h-4" /> Restart
                    </span>
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pause Overlay */}
            <AnimatePresence>
              {isPaused && !isGameOver && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 bg-black/40 flex flex-col items-center justify-center backdrop-blur-[2px]"
                >
                  <button 
                    onClick={() => setIsPaused(false)}
                    className="flex flex-col items-center gap-4 group"
                  >
                    <div className="w-16 h-16 rounded-full border-2 border-neon-cyan flex items-center justify-center text-neon-cyan group-hover:bg-neon-cyan group-hover:text-black transition-all">
                      <Play className="w-8 h-8 fill-current" />
                    </div>
                    <motion.span 
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="font-mono text-neon-cyan tracking-[0.3em] uppercase text-xl font-bold"
                    >
                      Press Start
                    </motion.span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Render Snake */}
            {snake.map((segment, i) => (
              <div 
                key={i}
                className={`absolute w-[5%] h-[5%] transition-all duration-100 ${
                  i === 0 
                  ? 'bg-neon-cyan z-10 shadow-[0_0_15px_rgba(0,255,255,0.8)]' 
                  : 'bg-neon-cyan/40 scale-90'
                }`}
                style={{ 
                  left: `${segment.x * 5}%`, 
                  top: `${segment.y * 5}%`,
                  borderRadius: i === 0 ? '2px' : '4px'
                }}
              />
            ))}

            {/* Render Food */}
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.8, 1, 0.8]
              }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="absolute w-[5%] h-[5%] bg-neon-pink rounded-full shadow-[0_0_15px_rgba(255,0,127,0.8)]"
              style={{ left: `${food.x * 5}%`, top: `${food.y * 5}%` }}
            />
          </div>
        </div>

        {/* Right Side: Media Player */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-black/40 border border-neon-cyan/20 p-6 rounded-xl backdrop-blur-md overflow-hidden relative group">
            <h2 className="text-xs font-mono uppercase text-neon-lime mb-6 flex items-center gap-2">
              <Music className="w-4 h-4" /> Media Core
            </h2>
            
            <div className="mb-6">
              <p className="text-neon-cyan font-bold truncate">{playlist[currentTrackIndex].title}</p>
              <p className="text-zinc-500 text-xs font-mono">{playlist[currentTrackIndex].artist}</p>
            </div>

            <div className="flex items-center justify-between mb-6">
              <button onClick={prevTrack} className="text-zinc-400 hover:text-neon-cyan transition-colors">
                <SkipBack className="w-5 h-5" />
              </button>
              <button 
                onClick={togglePlay}
                className="w-12 h-12 rounded-full border border-neon-cyan/50 flex items-center justify-center text-neon-cyan hover:bg-neon-cyan hover:text-black transition-all"
              >
                {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
              </button>
              <button onClick={nextTrack} className="text-zinc-400 hover:text-neon-cyan transition-colors">
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 text-zinc-500">
              <Volume2 className="w-4 h-4" />
              <div className="h-1 flex-1 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-neon-lime w-2/3" />
              </div>
            </div>

            {/* Animation Bars */}
            <div className="absolute bottom-0 left-0 right-0 h-1 flex items-end justify-between opacity-30">
              {isPlaying && Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ height: ['4px', `${Math.random() * 20 + 4}px`, '4px'] }}
                  transition={{ repeat: Infinity, duration: 0.5 + Math.random() }}
                  className="w-1 bg-neon-lime"
                />
              ))}
            </div>
          </div>

          <div className="bg-neon-pink/10 border border-neon-pink/20 p-4 rounded-xl">
            <p className="text-[10px] font-mono text-neon-pink uppercase mb-2">System Broadcast</p>
            <p className="text-xs text-zinc-300 leading-relaxed italic">
              "The grid is your home, the light is your life. Consume to evolve. Accelerate to transcend."
            </p>
          </div>
        </div>
      </main>

      {/* Hidden Audio Element */}
      <audio 
        ref={audioRef}
        src={playlist[currentTrackIndex].url}
        onEnded={nextTrack}
        loop={false}
      />

      <footer className="mt-12 text-zinc-600 font-mono text-[10px] uppercase tracking-widest">
        &copy; 2026 Cyberdyne Systems // Sector 7G
      </footer>
    </div>
  );
}
