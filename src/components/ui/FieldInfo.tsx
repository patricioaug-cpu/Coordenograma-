import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FieldInfoProps {
  label: string;
  description: string;
  className?: string;
}

export const FieldInfo: React.FC<FieldInfoProps> = ({ label, description, className = "" }) => {
  const [show, setShow] = useState(false);

  return (
    <div className={`relative flex items-center gap-1.5 ${className}`}>
      <label className="text-[10px] text-zinc-500 uppercase block select-none">{label}</label>
      <div 
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="cursor-help text-zinc-700 hover:text-green-500 transition-colors"
      >
        <HelpCircle className="w-3 h-3" />
      </div>
      
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-zinc-900 border border-green-900/50 rounded-lg shadow-2xl z-[100] pointer-events-none"
          >
            <p className="text-[10px] text-green-400 font-medium leading-relaxed">
              {description}
            </p>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-zinc-900"></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
