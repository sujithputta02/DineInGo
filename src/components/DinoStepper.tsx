import React from 'react';
import { motion } from 'framer-motion';

interface DinoStepperProps {
    currentStep: number; // 0 to 4
}

const steps = [
    { label: 'Select', icon: '🍽️' },
    { label: 'Menu', icon: '🥘' },
    { label: 'Preview', icon: '📝' },
    { label: 'Table', icon: '🪑' },
    { label: 'Confirm', icon: '🎉' }
];

export const DinoStepper: React.FC<DinoStepperProps> = ({ currentStep }) => {
    return (
        <div className="w-full max-w-2xl mx-auto py-8">
            <div className="flex items-center justify-between relative px-4">
                {/* Connection Lines */}
                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -translate-y-1/2 z-0">
                    <motion.div
                        className="h-full bg-emerald-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                        transition={{ duration: 1, ease: "easeInOut" }}
                    />
                </div>

                {/* Steps */}
                {steps.map((step, idx) => {
                    const isActive = idx <= currentStep;
                    const isCurrent = idx === currentStep;

                    return (
                        <div key={idx} className="relative z-10 flex flex-col items-center">
                            <motion.div
                                initial={false}
                                animate={{
                                    scale: isCurrent ? 1.2 : 1,
                                    backgroundColor: isActive ? '#10b981' : '#f3f4f6',
                                    borderColor: isActive ? '#059669' : '#e5e7eb',
                                }}
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 shadow-lg relative overflow-visible`}
                            >
                                <span className="text-xl">{step.icon}</span>

                                {/* Footprint Animation for Active Steps */}
                                {isActive && (
                                    <motion.span
                                        initial={{ opacity: 0, scale: 0 }}
                                        animate={{ opacity: 0.4, scale: 1 }}
                                        className="absolute -top-6 -left-4 text-2xl rotate-[-20deg]"
                                    >
                                        👣
                                    </motion.span>
                                )}
                                {isActive && idx > 0 && (
                                    <motion.span
                                        initial={{ opacity: 0, scale: 0 }}
                                        animate={{ opacity: 0.4, scale: 1 }}
                                        className="absolute -top-6 -right-4 text-2xl rotate-[20deg]"
                                    >
                                        👣
                                    </motion.span>
                                )}
                            </motion.div>
                            <p className={`mt-2 text-xs font-bold uppercase tracking-tighter ${isActive ? 'text-emerald-600' : 'text-gray-400'}`}>
                                {step.label}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Dino Message */}
            <motion.div
                key={currentStep}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-center mt-6"
            >
                <p className="text-xs text-emerald-600/60 font-medium italic">
                    {currentStep === 0 && "🦖 Stomp into your favorite restaurant!"}
                    {currentStep === 1 && "🦖 Yummy! Dino love these choices!"}
                    {currentStep === 2 && "🦖 Let's check if everything is prehistoric perfection!"}
                    {currentStep === 3 && "🦖 Pick a spot where you won't get extinct!"}
                    {currentStep === 4 && "🦖 RAWR! Almost there, human!"}
                </p>
            </motion.div>
        </div>
    );
};
