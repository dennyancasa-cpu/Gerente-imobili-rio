import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

interface RobotAssistantProps {
  alertsCount: number;
  onOpenAssistant: () => void;
}

export function CustomRobotAssistant({ alertsCount, onOpenAssistant }: RobotAssistantProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'working' | 'thinking'>('idle');
  const [isShrunk, setIsShrunk] = useState(false);

  useEffect(() => {
    const handleRobotState = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.state) {
        setState(customEvent.detail.state);
        // If it's not idle, we might want to automatically return to idle after a while
        // unless specified otherwise.
        if (customEvent.detail.message) {
          setMessage(customEvent.detail.message);
        } else {
          setMessage(null);
        }
        
        if (customEvent.detail.autoRevert !== false && customEvent.detail.state !== 'idle') {
           setTimeout(() => {
             setState('idle');
             setMessage(null);
             setIsShrunk(true); // Shrink again after temporary state ends
           }, customEvent.detail.duration || 5000);
        }
        
        if (customEvent.detail.state !== 'idle') {
          setIsShrunk(false); // Unshrink when active
        }
      }
    };
    window.addEventListener('robot-state', handleRobotState);
    return () => window.removeEventListener('robot-state', handleRobotState);
  }, []);

  useEffect(() => {
    // Initial automated analysis on app load
    const timer = setTimeout(() => {
      setState('working');
      
      if (alertsCount > 0) {
        setMessage(`Olá! Analisei os dados e encontrei ${alertsCount} pendências importantes que precisam da sua atenção hoje.`);
      } else {
        setMessage('Olá! Fiz uma análise rápida e, por enquanto, tudo parece estar em ordem.');
      }

      setTimeout(() => {
        setMessage(null);
        setState('idle');
        setIsShrunk(true);
      }, 8000);
    }, 2000);

    return () => clearTimeout(timer);
  }, []); // Runs once on mount

  if (!isVisible) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsVisible(true)}
        className="fixed bottom-6 right-6 z-[60] bg-white p-3 rounded-full shadow-xl border border-slate-200"
        title="Chamar Assistente"
      >
        <svg viewBox="0 0 200 240" className="w-8 h-8" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="pinGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2dbf64" />
              <stop offset="100%" stopColor="#0c6b37" />
            </linearGradient>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
          </defs>
          <ellipse cx="100" cy="220" rx="60" ry="15" fill="#2dbf64" />
          <ellipse cx="100" cy="220" rx="40" ry="10" fill="#042f1c" />
          <path d="M 0 90 C 0 -10, 200 -10, 200 90 C 200 160, 100 210, 100 210 C 100 210, 0 160, 0 90 Z" fill="url(#pinGrad)" />
          <path d="M 15 90 C 15 10, 185 10, 185 90 C 185 150, 100 195, 100 195 C 100 195, 15 150, 15 90 Z" fill="#ffffff" />
          <path d="M 100 10 L 190 70 L 160 80 L 100 35 L 40 80 L 10 70 Z" fill="#146d36" />
          <rect x="40" y="20" width="15" height="30" fill="#146d36" />
          <path d="M 45 145 L 65 145 L 65 180 L 45 180 Z" fill="url(#barGrad)" />
          <path d="M 80 110 L 100 110 L 100 170 L 80 170 Z" fill="url(#barGrad)" />
          <path d="M 115 75 L 135 75 L 135 160 L 115 160 Z" fill="url(#barGrad)" />
          <path d="M 150 40 L 170 40 L 170 145 L 150 145 Z" fill="url(#barGrad)" />
          <rect x="90" y="60" width="8" height="8" fill="#146d36" />
          <rect x="102" y="60" width="8" height="8" fill="#146d36" />
          <rect x="90" y="72" width="8" height="8" fill="#146d36" />
          <rect x="102" y="72" width="8" height="8" fill="#146d36" />
        </svg>
      </motion.button>
    );
  }

  const getImage = () => {
    switch (state) {
      case 'thinking': return '/robot_thinking.png';
      case 'working': return '/robot_working.png';
      default: return '/robot_idle.png';
    }
  };

  return (
    <motion.div
      drag
      dragConstraints={typeof window !== 'undefined' ? { 
        left: -window.innerWidth + 200, 
        right: 0, 
        top: -window.innerHeight + 200, 
        bottom: 0 
      } : { left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.05}
      dragMomentum={false}
      className="fixed bottom-24 right-8 z-[60] flex items-end justify-end cursor-grab active:cursor-grabbing"
      initial={{ x: 100, opacity: 0, scale: 0.5 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
    >
      <div className="relative flex flex-col items-center">
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: 20, y: 10 }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 20, y: 10 }}
              className="absolute bottom-[105%] right-14 bg-white rounded-2xl rounded-br-none p-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 mb-2 w-max max-w-[240px] pointer-events-none"
            >
              <p className="text-sm text-slate-700 font-medium leading-relaxed">{message}</p>
              <div className="absolute -bottom-2 right-4 w-4 h-4 bg-white border-r border-b border-slate-200 transform translate-y-1/2 rotate-45"></div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="relative group p-2 cursor-pointer" onClick={onOpenAssistant}>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsVisible(false);
            }}
            className="absolute -top-3 -right-3 md:-top-2 md:-right-2 bg-slate-800 text-white rounded-full p-2.5 md:p-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200 z-10 shadow-lg hover:bg-rose-500 hover:scale-110 flex items-center justify-center w-11 h-11 md:w-7 md:h-7"
            aria-label="Minimizar assistente"
            title="Minimizar assistente"
          >
            <X className="w-5 h-5 md:w-3.5 md:h-3.5" />
          </button>
          
          <motion.img 
            key={getImage()} // Key change triggers animation on image swap
            initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0, y: [0, -12, 0] }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ 
              default: { duration: 0.3 },
              y: { repeat: Infinity, duration: 3.5, ease: "easeInOut" }
            }}
            src={getImage()} 
            alt="Robot Assistant" 
            className={cn(
              "object-contain pointer-events-none filter drop-shadow-2xl mix-blend-multiply transition-all duration-700",
              isShrunk ? "w-20 h-20" : "w-36 h-36"
            )}
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </motion.div>
  );
}
