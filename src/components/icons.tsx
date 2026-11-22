const base = {
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
};

export const IconCopy = () => (
    <svg {...base}>
        <rect x="5" y="5" width="8.5" height="8.5" rx="1.5" />
        <path d="M10.5 5V3.5A1.5 1.5 0 0 0 9 2H3.5A1.5 1.5 0 0 0 2 3.5V9a1.5 1.5 0 0 0 1.5 1.5H5" />
    </svg>
);
export const IconCheck = () => (
    <svg {...base}>
        <path d="M3 8.5l3.2 3L13 4.5" />
    </svg>
);
export const IconDownload = () => (
    <svg {...base}>
        <path d="M8 2.5v8M4.5 7.5L8 11l3.5-3.5M3 13.5h10" />
    </svg>
);
export const IconRefresh = () => (
    <svg {...base}>
        <path d="M13 8a5 5 0 1 1-1.5-3.6M13 2.5V5h-2.5" />
    </svg>
);
export const IconAlert = () => (
    <svg {...base}>
        <circle cx="8" cy="8" r="6" />
        <path d="M8 4.8v3.6M8 10.9v.1" />
    </svg>
);
export const IconBraces = () => (
    <svg {...base} viewBox="0 0 24 24">
        <path d="M8 3H7a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1M16 3h1a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-1" />
    </svg>
);
export const IconChevron = () => (
    <svg {...base}>
        <path d="M6 3.5L10.5 8 6 12.5" />
    </svg>
);
/** solid disclosure triangle, pointing down (open); rotate -90deg for closed */
export const IconTriangle = () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M3.5 5.5h9L8 11.2z" fill="currentColor" strokeLinejoin="round" />
    </svg>
);
export const IconPencil = () => (
    <svg {...base}>
        <path d="M10.8 2.7l2.5 2.5-7.8 7.8-3 .5.5-3z M9.3 4.2l2.5 2.5" />
    </svg>
);
export const IconReplace = () => (
    <svg {...base}>
        <path d="M2.5 4.5h6M6.5 2.5l2 2-2 2M13.5 11.5h-6M9.5 9.5l-2 2 2 2" />
    </svg>
);
/** crosshair: jump to the same spot in the input */
export const IconLocate = () => (
    <svg {...base}>
        <circle cx="8" cy="8" r="3.2" />
        <path d="M8 1.8v2.4M8 11.8v2.4M1.8 8h2.4M11.8 8h2.4" />
    </svg>
);
export const IconSwap = () => (
    <svg {...base}>
        <path d="M2.5 5.5h10M10 3l2.5 2.5L10 8M13.5 10.5h-10M6 8l-2.5 2.5L6 13" />
    </svg>
);
export const IconUnfold = () => (
    <svg {...base}>
        <path d="M5 6l3-3 3 3M5 10l3 3 3-3" />
    </svg>
);
export const IconSearch = () => (
    <svg {...base}>
        <circle cx="7" cy="7" r="4.5" />
        <path d="M10.5 10.5L14 14" />
    </svg>
);
export const IconWrench = () => (
    <svg {...base}>
        <path d="M10.2 2.3a3.2 3.2 0 0 0-3.5 4.3L2.6 10.7a1.3 1.3 0 0 0 1.8 1.8l4.1-4.1a3.2 3.2 0 0 0 4.3-3.5l-1.9 1.9-1.6-.3-.3-1.6z" />
    </svg>
);
