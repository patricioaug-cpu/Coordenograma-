import React from 'react';
import { AuthProvider, LoginView } from './components/Auth';
import { CoordSystem } from './components/CoordSystem';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  return (
    <div className="min-h-screen bg-black text-[#4ade80] font-mono selection:bg-[#22c55e] selection:text-black">
      <AuthProvider>
        {(user, loading) => {
          if (loading) {
            return (
              <div className="h-screen flex items-center justify-center">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-12 h-12 border-4 border-[#22c55e] border-t-transparent rounded-full"
                />
              </div>
            );
          }

          if (!user) {
            return <LoginView />;
          }

          return (
            <AnimatePresence mode="wait">
              <motion.div
                key="app-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <CoordSystem user={user} />
              </motion.div>
            </AnimatePresence>
          );
        }}
      </AuthProvider>
    </div>
  );
}
