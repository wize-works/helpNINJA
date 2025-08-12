"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface AnimatedPageProps {
    children: ReactNode;
    className?: string;
}

// Page transition variants
const pageVariants = {
    initial: {
        opacity: 0,
        y: 20,
    },
    in: {
        opacity: 1,
        y: 0,
    },
    out: {
        opacity: 0,
        y: -20,
    },
};

const pageTransition = {
    type: "tween" as const,
    ease: "anticipate" as const,
    duration: 0.3,
};

// Stagger animation for child elements
const containerVariants = {
    initial: {
        opacity: 0,
    },
    in: {
        opacity: 1,
        transition: {
            duration: 0.3,
            staggerChildren: 0.1,
        },
    },
    out: {
        opacity: 0,
    },
};

const childVariants = {
    initial: {
        opacity: 0,
        y: 20,
    },
    in: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.3,
            ease: "easeOut" as const,
        },
    },
};

export function AnimatedPage({ children, className = "" }: AnimatedPageProps) {
    return (
        <motion.div
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            className={className}
        >
            {children}
        </motion.div>
    );
}

export function StaggerContainer({ children, className = "" }: AnimatedPageProps) {
    return (
        <motion.div
            initial="initial"
            animate="in"
            exit="out"
            variants={containerVariants}
            className={className}
        >
            {children}
        </motion.div>
    );
}

export function StaggerChild({ children, className = "" }: AnimatedPageProps) {
    return (
        <motion.div
            variants={childVariants}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// Hover animation for interactive elements
export function HoverScale({ children, className = "", scale = 1.05 }: AnimatedPageProps & { scale?: number }) {
    return (
        <motion.div
            whileHover={{ scale }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// Fade in animation for loading content
export function FadeIn({ children, className = "", delay = 0 }: AnimatedPageProps & { delay?: number }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// Slide in from different directions
export function SlideIn({ 
    children, 
    className = "", 
    direction = "up",
    distance = 20,
    duration = 0.3,
    delay = 0
}: AnimatedPageProps & { 
    direction?: "up" | "down" | "left" | "right";
    distance?: number;
    duration?: number;
    delay?: number;
}) {
    const getInitialPosition = () => {
        switch (direction) {
            case "up": return { y: distance };
            case "down": return { y: -distance };
            case "left": return { x: distance };
            case "right": return { x: -distance };
            default: return { y: distance };
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, ...getInitialPosition() }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration, delay, ease: "easeOut" }}
            className={className}
        >
            {children}
        </motion.div>
    );
} 