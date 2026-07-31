export default function OriNetLogo({ size = "large" }) {
  const isLarge = size === "large";
  const fontSize = isLarge ? 56 : 30;
  const tagSize = 13;
  const width = isLarge ? 220 : 118;
  const textY = isLarge ? 58 : 32;

  return (
    <svg
      width={width}
      height={isLarge ? textY + 28 : textY + 4}
      viewBox={`0 0 ${width} ${isLarge ? textY + 28 : textY + 4}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="20%" stopColor="#ec4899" />
          <stop offset="42%" stopColor="#f97316" />
          <stop offset="60%" stopColor="#eab308" />
          <stop offset="82%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
        <linearGradient id="tagGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
        <filter id="textGlow" x="-5%" y="-20%" width="110%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <text
        x={width / 2}
        y={textY}
        textAnchor="middle"
        fontFamily="'Outfit', 'Segoe UI', sans-serif"
        fontSize={fontSize}
        fontWeight="800"
        fill="url(#textGrad)"
        filter="url(#textGlow)"
        letterSpacing="-1"
      >
        OriNet
      </text>

      {isLarge && (
        <text
          x={width / 2}
          y={textY + 22}
          textAnchor="middle"
          fontFamily="'Outfit', 'Segoe UI', sans-serif"
          fontSize={tagSize}
          fontWeight="400"
          fill="url(#tagGrad)"
          letterSpacing="1"
        >
          Tu Servicio de Internet
        </text>
      )}
    </svg>
  );
}
