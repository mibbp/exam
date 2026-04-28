import type { PropsWithChildren, ReactNode } from 'react';
import { motion } from 'framer-motion';

type AnimatedItemProps = PropsWithChildren<{
  className?: string;
  delay?: number;
  as?: 'div' | 'section' | 'article';
}>;

const pageVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: 'easeOut' as const,
      staggerChildren: 0.07,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: 'easeOut' as const },
  },
};

export function PageMotion({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <motion.div className={className} initial="hidden" animate="visible" variants={pageVariants}>
      {children}
    </motion.div>
  );
}

export function AnimatedItem({ children, className, delay = 0, as = 'div' }: AnimatedItemProps) {
  const sharedProps = {
    className,
    variants: itemVariants,
    transition: { delay },
  };

  if (as === 'section') {
    return <motion.section {...sharedProps}>{children}</motion.section>;
  }
  if (as === 'article') {
    return <motion.article {...sharedProps}>{children}</motion.article>;
  }
  return <motion.div {...sharedProps}>{children}</motion.div>;
}

export function MotionButtonShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
      {children}
    </motion.div>
  );
}
