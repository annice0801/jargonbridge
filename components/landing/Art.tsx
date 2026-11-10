// 所有圖都是 SVG 繪製，不依賴外部圖片。全部為裝飾，對輔助科技隱藏。

export function Filters() {
  return (
    <svg aria-hidden="true" width="0" height="0" className="absolute">
      <defs>
        <filter id="brush" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035 0.09" numOctaves="3" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="9" />
        </filter>
        <filter id="rough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="5" />
        </filter>
        {/* 細筆用：只讓線條邊緣微微抖動，不會像粗筆那樣變形 */}
        <filter id="ink-fine" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="11" />
          <feDisplacementMap in="SourceGraphic" scale="1.6" />
        </filter>
        <linearGradient id="wash-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8d8579" stopOpacity="0.42" />
          <stop offset="0.75" stopColor="#8d8579" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="wash-mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5e574e" stopOpacity="0.62" />
          <stop offset="0.8" stopColor="#5e574e" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="wash-near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b2723" stopOpacity="0.72" />
          <stop offset="0.92" stopColor="#2b2723" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="glaze" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b9ab97" />
          <stop offset="0.55" stopColor="#8f8373" />
          <stop offset="1" stopColor="#5f564b" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Enso({ className = "", stroke = "#2b2723" }: { className?: string; stroke?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 400 400" className={className}>
      <path
        d="M 262 62 C 180 26 84 62 56 150 C 28 240 88 338 186 348 C 286 358 358 280 346 186 C 338 124 298 84 240 70"
        fill="none"
        stroke={stroke}
        strokeWidth="17"
        strokeLinecap="round"
        filter="url(#brush)"
      />
    </svg>
  );
}

const FAR = "M0 330 C 150 250 260 300 400 220 C 520 150 620 260 760 210 C 900 160 1010 110 1160 200 C 1270 260 1360 230 1440 190 L1440 600 L0 600 Z";
const MID = "M0 420 C 130 340 240 400 360 340 C 500 270 600 390 760 350 C 880 320 960 250 1090 310 C 1210 370 1320 330 1440 290 L1440 600 L0 600 Z";
const NEAR = "M0 500 C 180 440 300 500 470 470 C 640 440 740 520 930 480 C 1110 440 1260 480 1440 430 L1440 600 L0 600 Z";

export function Mountain({ layer, className = "" }: { layer: "far" | "mid" | "near"; className?: string }) {
  const d = { far: FAR, mid: MID, near: NEAR }[layer];
  return (
    <svg aria-hidden="true" viewBox="0 0 1440 600" preserveAspectRatio="xMidYMax slice" className={className}>
      <path d={d} fill={`url(#wash-${layer})`} />
    </svg>
  );
}

// 三次貝茲曲線上的點，用來把欄杆柱精準放在弧線上。
function cubicPoint(p: number[], t: number) {
  const u = 1 - t;
  const x = u * u * u * p[0] + 3 * u * u * t * p[2] + 3 * u * t * t * p[4] + t * t * t * p[6];
  const y = u * u * u * p[1] + 3 * u * u * t * p[3] + 3 * u * t * t * p[5] + t * t * t * p[7];
  return { x, y };
}

const RAIL = [44, 100, 152, 30, 328, 30, 436, 100];
const DECK = [20, 128, 140, 50, 340, 50, 460, 128];
// 橋面在某個 x 的高度：沿曲線取樣找最接近的點，柱子才會垂直落在橋面上。
const DECK_SAMPLES = Array.from({ length: 200 }, (_, index) => cubicPoint(DECK, index / 199));
const deckY = (x: number) => DECK_SAMPLES.reduce((best, point) => (Math.abs(point.x - x) < Math.abs(best.x - x) ? point : best)).y;

const POSTS = Array.from({ length: 13 }, (_, index) => cubicPoint(RAIL, 0.02 + index * 0.08)).map((top) => ({
  top,
  bottom: { x: top.x, y: deckY(top.x) },
}));

// 兩岸之間的一座橋：細筆白描的拱橋，下方是水面倒影和漣漪。產品名的具象化。
export function Bridge({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 480 220" className={className} fill="none" stroke="#2b2723" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <radialGradient id="bridge-wash" cx="0.5" cy="0.35" r="0.6">
          <stop offset="0" stopColor="#2b2723" stopOpacity="0.1" />
          <stop offset="1" stopColor="#2b2723" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bridge-reflect" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b2723" stopOpacity="0.22" />
          <stop offset="1" stopColor="#2b2723" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* 拱下的淡墨 */}
      <ellipse cx="240" cy="132" rx="190" ry="54" fill="url(#bridge-wash)" stroke="none" />

      <g>
        {/* 欄杆：上下兩道扶手與細柱 */}
        <path d="M44 100 C 152 30 328 30 436 100" strokeWidth="1.3" />
        <path d="M46 112 C 154 44 326 44 434 112" strokeWidth="0.7" strokeOpacity="0.7" />
        {POSTS.map(({ top, bottom }, index) => (
          <path key={index} d={`M${top.x.toFixed(1)} ${(top.y - 3).toFixed(1)} L${bottom.x.toFixed(1)} ${bottom.y.toFixed(1)}`} strokeWidth={index === 0 || index === POSTS.length - 1 ? 1.6 : 0.9} />
        ))}
        {/* 橋面的厚度 */}
        <path d="M20 128 C 140 50 340 50 460 128" strokeWidth="2.2" />
        <path d="M24 134 C 142 58 338 58 456 134" strokeWidth="0.8" strokeOpacity="0.6" />
        {/* 拱腹與橋墩 */}
        <path d="M58 158 C 150 80 330 80 422 158" strokeWidth="1.6" />
        <path d="M66 158 C 156 90 324 90 414 158" strokeWidth="0.6" strokeOpacity="0.5" />
        <path d="M20 128 L 24 158 M460 128 L456 158" strokeWidth="1.2" />
      </g>

      {/* 水面：倒影和幾道漣漪 */}
      <path d="M58 160 C 150 226 330 226 422 160" stroke="url(#bridge-reflect)" strokeWidth="1.4" />
      <g strokeWidth="0.7" strokeOpacity="0.35">
        <path d="M6 160 L 70 160 M 412 160 L 474 160" strokeWidth="0.9" strokeOpacity="0.45" />
        <path d="M150 176 L 214 176 M 262 172 L 300 172" />
        <path d="M96 190 L 132 190 M 330 186 L 392 186" />
        <path d="M200 204 L 236 204 M 276 200 L 296 200" strokeOpacity="0.22" />
      </g>
    </svg>
  );
}

// 金繼的茶碗：釉色自然垂流，裂痕在捲動進入畫面時以金線一筆描上去。
export function KintsugiBowl({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 520 380" className={className}>
      <defs>
        <radialGradient id="bowl-shadow">
          <stop offset="0" stopColor="#2b2723" stopOpacity="0.22" />
          <stop offset="1" stopColor="#2b2723" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bowl-body" cx="0.32" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#d2c6b3" />
          <stop offset="0.45" stopColor="#a39581" />
          <stop offset="1" stopColor="#5a5046" />
        </radialGradient>
        <linearGradient id="bowl-drip" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2f2a26" stopOpacity="0.9" />
          <stop offset="1" stopColor="#4a3f36" stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id="bowl-inside" cx="0.5" cy="0.62" r="0.6">
          <stop offset="0" stopColor="#5a5046" />
          <stop offset="1" stopColor="#2b2622" />
        </radialGradient>
        <radialGradient id="bowl-sheen">
          <stop offset="0" stopColor="#fff" stopOpacity="0.2" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ecd08f" />
          <stop offset="0.5" stopColor="#c9a256" />
          <stop offset="1" stopColor="#9c7631" />
        </linearGradient>
      </defs>

      <ellipse cx="260" cy="350" rx="170" ry="14" fill="url(#bowl-shadow)" />
      {/* 高台 */}
      <path d="M204 328 L208 347 Q260 356 312 347 L316 328 Z" fill="#6b6054" />
      <path d="M208 347 Q260 356 312 347" fill="none" stroke="#3d3630" strokeWidth="1" strokeOpacity="0.5" />

      <g>
        {/* 碗身與垂流的釉 */}
        <path d="M58 110 C 62 214 128 318 214 332 C 244 336 276 336 306 332 C 392 318 458 214 462 110 Z" fill="url(#bowl-body)" />
        <path
          d="M58 110 C 140 134 380 134 462 110 C 461 130 458 148 452 160 C 440 152 430 174 416 170 C 400 164 392 188 374 182 C 356 174 344 198 324 192 C 304 186 292 206 270 200 C 250 194 236 208 216 198 C 198 190 186 202 168 190 C 150 178 140 192 124 178 C 110 166 98 178 86 162 C 74 148 66 152 62 138 Z"
          fill="url(#bowl-drip)"
        />
        {/* 碗口與內側 */}
        <path d="M58 110 C 120 84 400 84 462 110 C 400 136 120 136 58 110 Z" fill="url(#bowl-inside)" />
        <path d="M60 111 C 140 133 380 133 460 111" fill="none" stroke="#efe6d6" strokeWidth="1.2" strokeOpacity="0.45" />
        <path d="M62 109 C 124 87 396 87 458 109" fill="none" stroke="#efe6d6" strokeWidth="0.8" strokeOpacity="0.18" />
      </g>
      {/* 左側柔光，做出瓷面的弧度 */}
      <ellipse cx="150" cy="226" rx="46" ry="92" transform="rotate(-16 150 226)" fill="url(#bowl-sheen)" />

      {/* 金繼：缺口的金箔與蜿蜒的裂痕 */}
      <path className="gold-fill" d="M300 117 Q312 112 327 117 Q321 126 312 129 Q304 125 300 117 Z" fill="url(#gold)" />
      <g fill="none" stroke="url(#gold)" strokeLinecap="round" strokeLinejoin="round">
        <path className="gold-line" pathLength="1" strokeWidth="2.4" d="M314 129 L309 154 L322 181 L303 212 L315 244 L299 278 L306 318" />
        <path className="gold-line gold-line-late" pathLength="1" strokeWidth="1.5" d="M322 181 L348 192 L366 184 L392 210" />
        <path className="gold-line gold-line-late" pathLength="1" strokeWidth="1.3" d="M303 212 L274 226 L262 258" />
        <path className="gold-line gold-line-late" pathLength="1" strokeWidth="1.2" d="M118 124 L128 150 L121 174" />
      </g>
    </svg>
  );
}
