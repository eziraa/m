/**
 * BingoLogo — SVG logo matching the reference image style.
 * 3D golden letters B-I-N-G-O with a dollar sign in the O,
 * plus a red ribbon banner below.
 */

interface BingoLogoProps {
  ribbonText?: string;
}

export const BingoLogo = ({ ribbonText = "You Won!" }: BingoLogoProps) => {
  return (
    <div className="relative flex flex-col items-center select-none">
      {/* ── SVG Logo ── */}
      <svg
        viewBox="0 0 320 120"
        className="w-72 glow-gold float-anim"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gold gradient for letters */}
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFE566" />
            <stop offset="45%" stopColor="#FFC107" />
            <stop offset="100%" stopColor="#E67E00" />
          </linearGradient>
          {/* Orange outline gradient */}
          <linearGradient id="orangeOutline" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FF8C00" />
            <stop offset="100%" stopColor="#B85000" />
          </linearGradient>
          {/* Highlight sheen */}
          <linearGradient id="sheen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
          {/* Purple accent for i */}
          <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E879F9" />
            <stop offset="45%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
          {/* Green for dollar */}
          <linearGradient id="dollarGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#86EFAC" />
            <stop offset="100%" stopColor="#16A34A" />
          </linearGradient>
          {/* Drop shadow filter */}
          <filter
            id="letterShadow"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feDropShadow
              dx="2"
              dy="4"
              stdDeviation="3"
              floodColor="#000"
              floodOpacity="0.5"
            />
          </filter>
          <filter id="glowFilter">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── B ── */}
        <g filter="url(#letterShadow)" transform="translate(4, 0)">
          {/* 3D extrude layers */}
          {[4, 3, 2, 1].map((d) => (
            <text
              key={d}
              x="16"
              y="88"
              fontSize="78"
              fontWeight="900"
              fontFamily="'Arial Black', Arial, sans-serif"
              fill={`hsl(${38 - d * 3}, 80%, ${30 + d * 2}%)`}
              transform={`translate(${d}, ${d})`}
            >
              B
            </text>
          ))}
          <text
            x="16"
            y="88"
            fontSize="78"
            fontWeight="900"
            fontFamily="'Arial Black', Arial, sans-serif"
            fill="url(#goldGrad)"
            stroke="url(#orangeOutline)"
            strokeWidth="2.5"
            paintOrder="stroke"
          >
            B
          </text>
          <text
            x="16"
            y="88"
            fontSize="78"
            fontWeight="900"
            fontFamily="'Arial Black', Arial, sans-serif"
            fill="url(#sheen)"
          >
            B
          </text>
        </g>

        {/* ── i (smaller, with dot, purple tint) ── */}
        <g filter="url(#letterShadow)" transform="translate(68, 4)">
          {[3, 2, 1].map((d) => (
            <text
              key={d}
              x="0"
              y="84"
              fontSize="68"
              fontWeight="900"
              fontFamily="'Arial Black', Arial, sans-serif"
              fill={`hsl(270, 60%, ${25 + d * 3}%)`}
              transform={`translate(${d}, ${d})`}
            >
              i
            </text>
          ))}
          <text
            x="0"
            y="84"
            fontSize="68"
            fontWeight="900"
            fontFamily="'Arial Black', Arial, sans-serif"
            fill="url(#goldGrad)"
            stroke="#C77A00"
            strokeWidth="2.5"
            paintOrder="stroke"
          >
            i
          </text>
          {/* Dot with purple highlight */}
          <circle
            cx="14"
            cy="6"
            r="8"
            fill="url(#purpleGrad)"
            stroke="#7C3AED"
            strokeWidth="1.5"
          />
          <circle cx="12" cy="4" r="3" fill="#FFFFFF" opacity="0.5" />
        </g>

        {/* ── N ── */}
        <g filter="url(#letterShadow)" transform="translate(96, 0)">
          {[4, 3, 2, 1].map((d) => (
            <text
              key={d}
              x="0"
              y="88"
              fontSize="78"
              fontWeight="900"
              fontFamily="'Arial Black', Arial, sans-serif"
              fill={`hsl(38, 80%, ${28 + d * 2}%)`}
              transform={`translate(${d}, ${d})`}
            >
              N
            </text>
          ))}
          <text
            x="0"
            y="88"
            fontSize="78"
            fontWeight="900"
            fontFamily="'Arial Black', Arial, sans-serif"
            fill="url(#goldGrad)"
            stroke="url(#orangeOutline)"
            strokeWidth="2.5"
            paintOrder="stroke"
          >
            N
          </text>
          <text
            x="0"
            y="88"
            fontSize="78"
            fontWeight="900"
            fontFamily="'Arial Black', Arial, sans-serif"
            fill="url(#sheen)"
          >
            N
          </text>
        </g>

        {/* ── G ── */}
        <g filter="url(#letterShadow)" transform="translate(168, 0)">
          {[4, 3, 2, 1].map((d) => (
            <text
              key={d}
              x="0"
              y="88"
              fontSize="78"
              fontWeight="900"
              fontFamily="'Arial Black', Arial, sans-serif"
              fill={`hsl(38, 80%, ${28 + d * 2}%)`}
              transform={`translate(${d}, ${d})`}
            >
              G
            </text>
          ))}
          <text
            x="0"
            y="88"
            fontSize="78"
            fontWeight="900"
            fontFamily="'Arial Black', Arial, sans-serif"
            fill="url(#goldGrad)"
            stroke="url(#orangeOutline)"
            strokeWidth="2.5"
            paintOrder="stroke"
          >
            G
          </text>
          <text
            x="0"
            y="88"
            fontSize="78"
            fontWeight="900"
            fontFamily="'Arial Black', Arial, sans-serif"
            fill="url(#sheen)"
          >
            G
          </text>
        </g>

        {/* ── O with $ ── */}
        <g filter="url(#letterShadow)" transform="translate(240, 0)">
          {[4, 3, 2, 1].map((d) => (
            <text
              key={d}
              x="0"
              y="88"
              fontSize="78"
              fontWeight="900"
              fontFamily="'Arial Black', Arial, sans-serif"
              fill={`hsl(38, 80%, ${28 + d * 2}%)`}
              transform={`translate(${d}, ${d})`}
            >
              O
            </text>
          ))}
          <text
            x="0"
            y="88"
            fontSize="78"
            fontWeight="900"
            fontFamily="'Arial Black', Arial, sans-serif"
            fill="url(#goldGrad)"
            stroke="url(#orangeOutline)"
            strokeWidth="2.5"
            paintOrder="stroke"
          >
            O
          </text>
          <text
            x="0"
            y="88"
            fontSize="78"
            fontWeight="900"
            fontFamily="'Arial Black', Arial, sans-serif"
            fill="url(#sheen)"
          >
            O
          </text>
          {/* Dollar sign overlay in the O */}
          <text
            x="28"
            y="74"
            fontSize="34"
            fontWeight="900"
            fontFamily="'Arial Black', Arial, sans-serif"
            textAnchor="middle"
            fill="url(#dollarGrad)"
            stroke="#145A32"
            strokeWidth="1.5"
            paintOrder="stroke"
            filter="url(#glowFilter)"
          >
            $
          </text>
        </g>
      </svg>

      {/* ── Ribbon Banner ── */}
      <div className="relative -mt-2 ribbon-wave">
        <svg
          viewBox="0 0 280 60"
          className="w-64"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="ribbonGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#991B1B" />
            </linearGradient>
            <filter id="ribbonShadow">
              <feDropShadow
                dx="0"
                dy="3"
                stdDeviation="4"
                floodColor="#000"
                floodOpacity="0.4"
              />
            </filter>
          </defs>
          {/* Left tail */}
          <path d="M10,12 L0,30 L10,48 L30,48 L20,30 L30,12 Z" fill="#7F1D1D" />
          {/* Right tail */}
          <path
            d="M270,12 L280,30 L270,48 L250,48 L260,30 L250,12 Z"
            fill="#7F1D1D"
          />
          {/* Main ribbon body with curve */}
          <path
            d="M28,8 Q140,2 252,8 L258,30 Q140,38 22,30 Z"
            fill="url(#ribbonGrad)"
            filter="url(#ribbonShadow)"
          />
          {/* Highlight */}
          <path
            d="M40,10 Q140,5 240,10 L244,18 Q140,14 36,18 Z"
            fill="#FFFFFF"
            opacity="0.18"
          />
          {/* Text */}
          <text
            x="140"
            y="26"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="16"
            fontWeight="800"
            fontFamily="'Arial Black', Arial, sans-serif"
            fill="#FFFFFF"
            letterSpacing="1.5"
          >
            {ribbonText}
          </text>
        </svg>
      </div>
    </div>
  );
};
