/**
 * Arc Payment Rail — SVG logo component.
 * A stylised payment node: outer ring, inner hexagon grid, central dollar mark,
 * and a radiating pulse — evoking an agent broadcasting a USDC micropayment.
 */

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 48, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Arc Payment Rail logo"
    >
      <defs>
        {/* Blue core gradient */}
        <radialGradient id="coreGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#60a5fa" stopOpacity="1" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="1" />
        </radialGradient>

        {/* Ring glow */}
        <radialGradient id="ringGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
        </radialGradient>

        {/* Outer pulse mask */}
        <radialGradient id="pulseGrad" cx="50%" cy="50%" r="50%">
          <stop offset="60%" stopColor="#3b82f6" stopOpacity="0" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.18" />
        </radialGradient>

        <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outermost subtle pulse ring */}
      <circle cx="24" cy="24" r="23" fill="url(#pulseGrad)" />

      {/* Outer track ring */}
      <circle
        cx="24" cy="24" r="21"
        stroke="#3b82f6"
        strokeWidth="0.75"
        strokeOpacity="0.35"
        fill="none"
        strokeDasharray="3 2"
      />

      {/* Mid ring */}
      <circle
        cx="24" cy="24" r="17"
        stroke="#60a5fa"
        strokeWidth="0.5"
        strokeOpacity="0.25"
        fill="none"
      />

      {/* Connector spokes — 6 evenly spaced */}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = 24 + 13 * Math.cos(rad);
        const y1 = 24 + 13 * Math.sin(rad);
        const x2 = 24 + 20 * Math.cos(rad);
        const y2 = 24 + 20 * Math.sin(rad);
        return (
          <line
            key={i}
            x1={x1} y1={y1}
            x2={x2} y2={y2}
            stroke="#60a5fa"
            strokeWidth="0.75"
            strokeOpacity="0.4"
          />
        );
      })}

      {/* Node dots at spoke tips */}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const cx = 24 + 20 * Math.cos(rad);
        const cy = 24 + 20 * Math.sin(rad);
        return (
          <circle
            key={i}
            cx={cx} cy={cy} r="1.2"
            fill="#60a5fa"
            fillOpacity="0.7"
          />
        );
      })}

      {/* Payment pulse arc — top-right quadrant highlight */}
      <path
        d="M 24 3 A 21 21 0 0 1 44.5 17"
        stroke="#60a5fa"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        filter="url(#glow)"
        strokeOpacity="0.9"
      />

      {/* Core disc */}
      <circle cx="24" cy="24" r="11" fill="url(#coreGrad)" filter="url(#glow)" />

      {/* Core inner ring */}
      <circle
        cx="24" cy="24" r="11"
        stroke="#93c5fd"
        strokeWidth="0.5"
        strokeOpacity="0.6"
        fill="none"
      />

      {/* Dollar sign — crisp white */}
      <text
        x="24"
        y="28.5"
        textAnchor="middle"
        fontSize="12"
        fontWeight="700"
        fontFamily="'Space Grotesk', system-ui, sans-serif"
        fill="white"
        fillOpacity="0.95"
        letterSpacing="-0.5"
      >
        $
      </text>

      {/* Tiny "402" label beneath core */}
      <text
        x="24"
        y="40"
        textAnchor="middle"
        fontSize="4"
        fontWeight="600"
        fontFamily="'JetBrains Mono', monospace"
        fill="#60a5fa"
        fillOpacity="0.6"
        letterSpacing="0.5"
      >
        x402
      </text>
    </svg>
  );
}
