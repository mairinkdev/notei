import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

type IntroSplashProps = {
  isReady: boolean;
  onDone: () => void;
};

export function IntroSplash({ isReady, onDone }: IntroSplashProps) {
  const [visible, setVisible] = useState(true);
  const [canExit, setCanExit] = useState(false);
  const [completed, setCompleted] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const minDuration = prefersReducedMotion ? 180 : 520;
    const maxDuration = 1800;
    const minTimer = window.setTimeout(() => {
      setCanExit(true);
    }, minDuration);
    const maxTimer = window.setTimeout(() => {
      setCanExit(true);
      setVisible(false);
    }, maxDuration);
    return () => {
      window.clearTimeout(minTimer);
      window.clearTimeout(maxTimer);
    };
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (isReady && canExit) {
      setVisible(false);
    }
  }, [isReady, canExit]);

  const handleAnimationComplete = () => {
    if (!visible && !completed) {
      setCompleted(true);
      onDone();
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          aria-hidden="true"
          className="intro-splash pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--bg)]"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={
            prefersReducedMotion
              ? { duration: 0.18, ease: "easeOut" }
              : { duration: 0.38, ease: "easeInOut" }
          }
          onAnimationComplete={handleAnimationComplete}
        >
          <div className="relative flex items-center justify-center rounded-[28px] border border-[var(--surface-border)] bg-[var(--surface)]/70 px-10 py-8 shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_32px_80px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
            <motion.img
              src="/assets/logo-bg.png"
              alt=""
              className="h-[72px] w-[72px] select-none sm:h-[88px] sm:w-[88px]"
              width={88}
              height={88}
              draggable={false}
              initial={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.98 }
              }
              animate={
                prefersReducedMotion
                  ? { opacity: 1 }
                  : {
                      opacity: 1,
                      scale: 1,
                      boxShadow:
                        "0 0 60px 0 color-mix(in srgb, var(--text) 14%, transparent)",
                    }
              }
              transition={
                prefersReducedMotion
                  ? { duration: 0.16, ease: "easeOut" }
                  : { duration: 0.24, ease: "easeOut" }
              }
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
