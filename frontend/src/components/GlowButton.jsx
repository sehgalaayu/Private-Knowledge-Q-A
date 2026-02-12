import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export const GlowButton = ({ children, className, disabled, ...props }) => {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={cn(
        'relative inline-flex items-center justify-center rounded-lg',
        'bg-primary px-8 py-3 text-sm font-medium text-white',
        'transition-all hover:bg-primary/90',
        'hover:shadow-[0_0_20px_rgba(59,130,246,0.5)]',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none',
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
};