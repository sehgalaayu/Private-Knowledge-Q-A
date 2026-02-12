import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export const SourcePill = ({ children, className, ...props }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'inline-flex items-center gap-1 rounded-full',
        'border border-white/10 bg-white/5 px-3 py-1.5',
        'text-xs text-muted-foreground',
        'hover:bg-white/10 hover:text-white transition-colors cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
};