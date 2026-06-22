import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Minus } from 'lucide-react';
import { cn } from '../lib/utils';

interface RobotAssistantProps {
  alertsCount: number;
  onOpenAssistant: () => void;
}

export function CustomRobotAssistant({ alertsCount, onOpenAssistant }: RobotAssistantProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [state, setState] = useState<'idle' | 'working' | 'thinking' | 'greeting' | 'success' | 'juridico'>('idle');
  const [isShrunk, setIsShrunk] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleRobotState = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.state) {
        setState(customEvent.detail.state);
        setIsShrunk(customEvent.detail.state === 'idle'); // Shrink if idle, expand if not
        
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
        setMessage(`${alertsCount} alertas detectados`);
      } else {
        setMessage('Tudo regularizado');
      }
      
      setTimeout(() => {
        setState('idle');
        setMessage(null);
        setIsShrunk(true);
      }, 5000); // reduced from 8000 since there is no long text to read
    }, 2000);

    return () => clearTimeout(timer);
  }, [alertsCount]); // Runs once on mount


  if (!isVisible) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-[60] p-2 hover:bg-slate-100/50 rounded-full transition-colors"
        title="Chamar Assistente"
      >
        <img src="/robot_minimized.png" alt="Assistente Minimizado" className="w-12 h-12 object-contain filter drop-shadow-xl" />
      </motion.button>
    );
  }

  const getImage = () => {
    switch (state) {
      case 'thinking': return '/robot_thinking.png';
      case 'working': return '/robot_working.png';
      case 'greeting': return '/robot_greeting.png';
      case 'success': return '/robot_success.png';
      case 'juridico': return '/robot_juridico.png';
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
      className="fixed bottom-4 right-4 z-[60] flex items-end justify-end cursor-grab active:cursor-grabbing"
      initial={{ x: 100, opacity: 0, scale: 0.5 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
    >
      <div className="relative flex flex-col items-center">
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: 10, y: 5 }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 10, y: 5 }}
              className="absolute bottom-[105%] right-8 bg-white rounded-xl rounded-br-none p-2 shadow-lg border border-slate-200 mb-2 w-max max-w-[140px] pointer-events-none"
            >
              <p className="text-[11px] text-slate-600 font-medium leading-tight text-center">{message}</p>
              <div className="absolute -bottom-1 right-2 w-2 h-2 bg-white border-r border-b border-slate-200 transform translate-y-1/2 rotate-45"></div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="relative group p-2 cursor-pointer" onClick={onOpenAssistant}>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsVisible(false);
            }}
            className="absolute -top-1 -right-1 bg-slate-800/60 text-white rounded-full p-1 opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200 z-10 hover:bg-slate-800 flex items-center justify-center w-6 h-6 backdrop-blur-sm"
            aria-label="Minimizar assistente"
            title="Minimizar assistente"
          >
            <Minus className="w-3.5 h-3.5" />
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
              "object-contain pointer-events-none filter drop-shadow-2xl transition-all duration-700 transform-gpu origin-bottom-right",
              isShrunk ? "w-12 h-12" : state === 'juridico' ? "w-32 h-32" : "w-16 h-16"
            )}
          />
        </div>
      </div>
    </motion.div>
  );
}
