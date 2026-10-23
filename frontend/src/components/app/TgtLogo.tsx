export function TgtLogo({
  className = '',
  size = 'md',
  showText = true,
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}) {
  const iconDimensions = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-11 w-11',
  }[size];

  const titleSize = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Pro Vector Geometric Emblem */}
      <div className={`relative shrink-0 ${iconDimensions}`}>
        <svg
          viewBox="0 0 44 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full drop-shadow-[0_4px_12px_rgba(5,150,105,0.28)] transition-transform duration-300 hover:scale-105"
        >
          <defs>
            <linearGradient id="tgtGradA" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="60%" stopColor="#059669" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
            <linearGradient id="tgtGradB" x1="8" y1="4" x2="36" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="tgtGradHighlight" x1="12" y1="8" x2="32" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="tgtCenterGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
            </radialGradient>
          </defs>

          {/* Background rounded squircle with subtle border */}
          <rect
            x="2"
            y="2"
            width="40"
            height="40"
            rx="12"
            fill="url(#tgtGradA)"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1.2"
          />

          {/* Precision Financial Geometry: Interlocking Pillars & Growth Chevron */}
          {/* Top Architectural Lintel / Bar */}
          <path
            d="M10 12C10 10.8954 10.8954 10 12 10H32C33.1046 10 34 10.8954 34 12V15C34 16.1046 33.1046 17 32 17H12C10.8954 17 10 16.1046 10 15V12Z"
            fill="url(#tgtGradB)"
          />

          {/* Left Vertical Foundation Pillar */}
          <path
            d="M11 19C11 18.4477 11.4477 18 12 18H16C16.5523 18 17 18.4477 17 19V31C17 32.1046 16.1046 33 15 33H12C11.4477 33 11 32.5523 11 32V19Z"
            fill="white"
            fillOpacity="0.92"
          />

          {/* Central Ascending Growth Chevron / Dynamic Vault Arrow */}
          <path
            d="M20 33L20 22C20 21.4477 20.4477 21 21 21H24C24.5523 21 25 21.4477 25 22V33H20Z"
            fill="white"
            fillOpacity="0.75"
          />

          {/* Right Ascending Diamond/Arrow Pillar */}
          <path
            d="M28 33L28 18C28 17.4477 28.4477 17 29 17H32C32.5523 17 33 17.4477 33 18V30C33 31.6569 31.6569 33 30 33H28Z"
            fill="white"
            fillOpacity="0.95"
          />

          {/* Dynamic upward trend indicator pip */}
          <circle cx="31" cy="13.5" r="2" fill="#ecfdf5" />

          {/* Inner Light Flare / Specular highlight */}
          <path
            d="M12 11H32C32.5523 11 33 11.4477 33 12C33 12.5523 32.5523 13 32 13H12C11.4477 13 11 12.5523 11 12C11 11.4477 11.4477 11 12 11Z"
            fill="url(#tgtGradHighlight)"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`font-black tracking-tight text-slate-900 dark:text-white ${titleSize}`}>
              TGT
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
              PRO
            </span>
          </div>
          <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            FINANCE
          </span>
        </div>
      )}
    </div>
  );
}
