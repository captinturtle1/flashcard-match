// tailwind.config.mjs

import plugin from 'tailwindcss/plugin';

/** @type {import('tailwindcss').Config} */
const config = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}", // Make sure this path matches your project structure
    ],
    theme: {
        extend: {},
    },
    plugins: [
        plugin(function ({ addUtilities }) {
            addUtilities({
                '.rotate-y-180': {
                    transform: 'rotateY(180deg)',
                },
                '.transform-style-3d': {
                    transformStyle: 'preserve-3d',
                },
                '.perspective-1000': {
                    perspective: '1000px',
                },
                '.backface-hidden': {
                    backfaceVisibility: 'hidden',
                    '-webkit-backface-visibility': 'hidden',
                },
            });
        }),
    ],
};

export default config;