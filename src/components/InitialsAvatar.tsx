import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface InitialsAvatarProps {
    name?: string | null;
    className?: string;
    onClick?: () => void;
}

export const InitialsAvatar: React.FC<InitialsAvatarProps> = ({ name, className = '', onClick }) => {
    const initials = useMemo(() => {
        if (!name) return '??';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return parts[0].substring(0, 2).toUpperCase();
    }, [name]);

    const gradient = useMemo(() => {
        const colors = [
            'from-emerald-400 to-teal-500',
            'from-blue-400 to-indigo-500',
            'from-purple-400 to-pink-500',
            'from-orange-400 to-red-500',
            'from-cyan-400 to-blue-500',
        ];

        // Consistent color based on name
        const nameStr = name || 'User';
        let hash = 0;
        for (let i = 0; i < nameStr.length; i++) {
            hash = nameStr.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    }, [name]);

    return (
        <motion.div
            whileHover={onClick ? { scale: 1.05 } : {}}
            whileTap={onClick ? { scale: 0.95 } : {}}
            onClick={onClick}
            className={`relative flex items-center justify-center font-bold text-white shadow-inner bg-gradient-to-br ${gradient} ${className}`}
        >
            <span className="relative z-10 drop-shadow-md">
                {initials}
            </span>
            {/* Subtle glass effect overlay */}
            <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]" />
        </motion.div>
    );
};

export default InitialsAvatar;
