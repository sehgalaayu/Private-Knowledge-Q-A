import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export const GlassCard = ({ children, className, ...props }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'relative overflow-hidden rounded-xl border border-white/10',
        'bg-card/50 backdrop-blur-md p-6',
        'transition-all hover:border-white/20 hover:shadow-neon',
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
};