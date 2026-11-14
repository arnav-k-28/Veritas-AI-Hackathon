const toDataUri = (svg: string): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;

export const swerveStudentPhotoSvg = toDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420" width="640" height="420">
  <defs>
    <linearGradient id="bgPit" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#221a14"/>
      <stop offset="100%" stop-color="#140f0c"/>
    </linearGradient>
    <radialGradient id="flashGlow" cx="50%" cy="45%" r="55%">
      <stop offset="0%" stop-color="#facc15" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#140f0c" stop-opacity="0"/>
    </radialGradient>
    <pattern id="matGrid" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#3e3025" stroke-width="0.8"/>
    </pattern>
  </defs>
  <rect width="640" height="420" fill="url(#bgPit)"/>
  <rect width="640" height="420" fill="url(#matGrid)" opacity="0.5"/>
  <rect width="640" height="420" fill="url(#flashGlow)"/>

  <!-- Camera timestamp / Pit photo overlay -->
  <rect x="16" y="14" width="215" height="26" rx="6" fill="#18120e" fill-opacity="0.85" stroke="#5c4735"/>
  <circle cx="30" cy="27" r="4" fill="#ef4444"/>
  <text x="42" y="31" fill="#faf4e8" font-family="monospace" font-size="11">PIT-CAM • IMG_846_MK4I.JPG</text>

  <!-- Baseplate CNC aluminum -->
  <rect x="95" y="75" width="450" height="270" rx="18" fill="#4b5563" stroke="#9ca3af" stroke-width="3"/>
  <rect x="115" y="95" width="410" height="230" rx="12" fill="#374151" stroke="#6b7280" stroke-width="1.5"/>

  <!-- Bevel Gear Misaligned Area (x ~ 28%, y ~ 34% -> 180, 143) -->
  <g transform="translate(180,143)">
    <circle cx="0" cy="0" r="56" fill="#1f2937" stroke="#9ca3af" stroke-width="3"/>
    <circle cx="0" cy="0" r="44" fill="none" stroke="#eab308" stroke-width="5" stroke-dasharray="9 6"/>
    <!-- Chipped gear / wear particles -->
    <polygon points="18,-38 29,-42 25,-28" fill="#ef4444"/>
    <circle cx="-18" cy="24" r="3" fill="#facc15"/>
    <circle cx="-26" cy="18" r="2.2" fill="#facc15"/>
    <circle cx="-11" cy="30" r="2.5" fill="#facc15"/>
    <circle cx="0" cy="0" r="16" fill="#6b7280" stroke="#d1d5db" stroke-width="2"/>
    <rect x="-44" y="42" width="88" height="20" rx="4" fill="#7f1d1d" stroke="#ef4444"/>
    <text x="0" y="55" text-anchor="middle" fill="#fecaca" font-family="monospace" font-size="10" font-weight="bold">SHIM GAP / WEAR</text>
  </g>

  <!-- CANCoder Housing with Red Fault LED (x ~ 72%, y ~ 24% -> 460, 101) -->
  <g transform="translate(460,101)">
    <rect x="-46" y="-28" width="92" height="58" rx="8" fill="#111827" stroke="#4b5563" stroke-width="2.5"/>
    <circle cx="-20" cy="0" r="10" fill="#1f2937" stroke="#6b7280"/>
    <!-- Blinking Red LED -->
    <circle cx="22" cy="-6" r="8" fill="#ef4444"/>
    <circle cx="22" cy="-6" r="14" fill="#ef4444" opacity="0.28"/>
    <text x="0" y="20" text-anchor="middle" fill="#d1d5db" font-family="monospace" font-size="9">CANCODER #12</text>
    <!-- Skewed wire -->
    <path d="M 46 6 Q 76 15 80 58" fill="none" stroke="#facc15" stroke-width="3.5"/>
    <path d="M 46 12 Q 72 22 76 62" fill="none" stroke="#22c55e" stroke-width="3.5"/>
  </g>

  <!-- Billet Wheel & Loose Bolt (x ~ 52%, y ~ 74% -> 333, 311) -->
  <g transform="translate(333,275)">
    <rect x="-68" y="-32" width="136" height="64" rx="10" fill="#18120e" stroke="#facc15" stroke-width="3"/>
    <line x1="-55" y1="-22" x2="-35" y2="22" stroke="#3e3025" stroke-width="6"/>
    <line x1="-25" y1="-22" x2="-5" y2="22" stroke="#3e3025" stroke-width="6"/>
    <line x1="5" y1="-22" x2="25" y2="22" stroke="#3e3025" stroke-width="6"/>
    <line x1="35" y1="-22" x2="55" y2="22" stroke="#3e3025" stroke-width="6"/>
    <!-- Loose M4 bolt backing out at y ~ 311 -->
    <g transform="translate(0, 36)">
      <rect x="-12" y="-8" width="24" height="16" rx="3" fill="#d1d5db" stroke="#f97316" stroke-width="2"/>
      <line x1="-18" y1="0" x2="-26" y2="0" stroke="#f97316" stroke-width="2"/>
      <text x="0" y="24" text-anchor="middle" fill="#fed7aa" font-family="monospace" font-size="10" font-weight="bold">LOOSE M4 BOLT (NO LOCTITE)</text>
    </g>
  </g>
</svg>
`);

export const swerveCadSchematicSvg = toDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420" width="640" height="420">
  <defs>
    <pattern id="cadGrid" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#3e3025" stroke-width="0.7"/>
    </pattern>
  </defs>
  <rect width="640" height="420" fill="#161a24"/>
  <rect width="640" height="420" fill="url(#cadGrid)"/>

  <!-- CAD Title Block -->
  <rect x="14" y="14" width="612" height="392" fill="none" stroke="#facc15" stroke-width="1.5" stroke-opacity="0.5"/>
  <rect x="16" y="16" width="320" height="26" rx="4" fill="#1e293b" stroke="#facc15" stroke-opacity="0.6"/>
  <text x="26" y="33" fill="#fde047" font-family="monospace" font-size="11" font-weight="bold">846 CAD PDF • MK4I_SWERVE_REV3 (PAGE 14)</text>

  <!-- Wireframe Chassis Housing -->
  <rect x="95" y="75" width="450" height="270" rx="16" fill="#0f172a" fill-opacity="0.7" stroke="#60a5fa" stroke-width="2" stroke-dasharray="6 4"/>
  <rect x="115" y="95" width="410" height="230" rx="10" fill="none" stroke="#38bdf8" stroke-width="1.2"/>

  <!-- Reference Bevel Gear + 0.5mm Shim Callout (180, 143) -->
  <g transform="translate(180,143)">
    <circle cx="0" cy="0" r="56" fill="none" stroke="#38bdf8" stroke-width="2.5"/>
    <circle cx="0" cy="0" r="44" fill="none" stroke="#facc15" stroke-width="2.5" stroke-dasharray="4 3"/>
    <circle cx="0" cy="0" r="18" fill="#1e3a8a" fill-opacity="0.5" stroke="#93c5fd" stroke-width="2"/>
    <line x1="-65" y1="0" x2="65" y2="0" stroke="#60a5fa" stroke-width="0.8" stroke-dasharray="3 3"/>
    <line x1="0" y1="-65" x2="0" y2="65" stroke="#60a5fa" stroke-width="0.8" stroke-dasharray="3 3"/>
    <rect x="-64" y="42" width="128" height="20" rx="4" fill="#1e3a8a" stroke="#60a5fa"/>
    <text x="0" y="55" text-anchor="middle" fill="#dbeafe" font-family="monospace" font-size="10">0.5mm SHIM + MESH SPEC</text>
  </g>

  <!-- Reference CANCoder Magnet Spec (460, 101) -->
  <g transform="translate(460,101)">
    <rect x="-46" y="-28" width="92" height="58" rx="6" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
    <circle cx="-20" cy="0" r="10" fill="none" stroke="#93c5fd" stroke-dasharray="2 2"/>
    <circle cx="22" cy="-6" r="7" fill="#22c55e"/>
    <text x="0" y="20" text-anchor="middle" fill="#bae6fd" font-family="monospace" font-size="9">AIR GAP: 1.2mm ±0.3</text>
    <rect x="-58" y="34" width="116" height="18" rx="4" fill="#14532d" stroke="#22c55e"/>
    <text x="0" y="46" text-anchor="middle" fill="#bbf7d0" font-family="monospace" font-size="9">LED: SOLID GREEN OK</text>
  </g>

  <!-- Reference Bolt Torque Callout (333, 311) -->
  <g transform="translate(333,275)">
    <rect x="-68" y="-32" width="136" height="64" rx="8" fill="#0f172a" stroke="#93c5fd" stroke-width="2"/>
    <line x1="-68" y1="0" x2="68" y2="0" stroke="#38bdf8" stroke-width="1" stroke-dasharray="4 3"/>
    <g transform="translate(0, 36)">
      <rect x="-12" y="-8" width="24" height="16" rx="2" fill="#1e3a8a" stroke="#60a5fa" stroke-width="2"/>
      <text x="0" y="24" text-anchor="middle" fill="#fde047" font-family="monospace" font-size="10" font-weight="bold">M4x12 SHCS • 2.8 N·m + LOCTITE 243</text>
    </g>
  </g>
</svg>
`);

export const canStudentPhotoSvg = toDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420" width="640" height="420">
  <rect width="640" height="420" fill="#1c1510"/>
  <rect x="40" y="55" width="560" height="310" rx="12" fill="#2d221a" stroke="#5c4735" stroke-width="3"/>
  <rect x="16" y="14" width="230" height="26" rx="6" fill="#18120e" stroke="#5c4735"/>
  <circle cx="30" cy="27" r="4" fill="#ef4444"/>
  <text x="42" y="31" fill="#faf4e8" font-family="monospace" font-size="11">PIT-CAM • CAN_BELLYPAN.JPG</text>

  <!-- Sharp aluminum C-channel edge -->
  <rect x="180" y="65" width="36" height="290" fill="#9ca3af" stroke="#d1d5db" stroke-width="2"/>
  <text x="198" y="210" transform="rotate(-90 198 210)" text-anchor="middle" fill="#1f2937" font-family="monospace" font-size="11" font-weight="bold">SHARP 1x2 TUBE EDGE</text>

  <!-- Pinched/Frayed CAN wire (x ~ 34%, y ~ 44% -> 218, 185) -->
  <path d="M 70 185 Q 145 185 218 185 Q 310 185 400 235" fill="none" stroke="#facc15" stroke-width="5"/>
  <path d="M 70 194 Q 145 194 218 190 Q 310 192 400 242" fill="none" stroke="#22c55e" stroke-width="5"/>
  <circle cx="218" cy="186" r="20" fill="#ef4444" fill-opacity="0.25" stroke="#ef4444" stroke-width="2" stroke-dasharray="4 3"/>
  <text x="218" y="155" text-anchor="middle" fill="#fca5a5" font-family="monospace" font-size="10" font-weight="bold">NICKED INSULATION (SHORT)</text>

  <!-- TalonFX Motor Controller (x ~ 69%, y ~ 56% -> 442, 235) -->
  <g transform="translate(442,235)">
    <rect x="-56" y="-42" width="112" height="84" rx="8" fill="#111827" stroke="#4b5563" stroke-width="3"/>
    <circle cx="0" cy="0" r="24" fill="#1f2937" stroke="#6b7280"/>
    <!-- Orange/Red Fault LED -->
    <rect x="26" y="-28" width="16" height="10" rx="3" fill="#f97316"/>
    <rect x="26" y="-14" width="16" height="10" rx="3" fill="#ef4444"/>
    <text x="0" y="34" text-anchor="middle" fill="#fed7aa" font-family="monospace" font-size="9" font-weight="bold">TALONFX FAULT LED</text>
  </g>
</svg>
`);

export const canCadSchematicSvg = toDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420" width="640" height="420">
  <rect width="640" height="420" fill="#131924"/>
  <rect x="16" y="16" width="330" height="26" rx="4" fill="#1e293b" stroke="#facc15" stroke-opacity="0.6"/>
  <text x="26" y="33" fill="#fde047" font-family="monospace" font-size="11" font-weight="bold">846 ELECTRICAL SOP v4 • CAN TOPOLOGY (PAGE 7)</text>

  <rect x="40" y="55" width="560" height="310" rx="12" fill="#0f172a" stroke="#38bdf8" stroke-width="2" stroke-dasharray="6 4"/>
  <rect x="180" y="65" width="36" height="290" fill="#1e293b" stroke="#60a5fa" stroke-width="2"/>
  <!-- Grommet spec (218, 185) -->
  <rect x="174" y="168" width="48" height="36" rx="8" fill="#22c55e" fill-opacity="0.25" stroke="#22c55e" stroke-width="2.5"/>
  <path d="M 70 185 L 400 235" fill="none" stroke="#facc15" stroke-width="4"/>
  <path d="M 70 192 L 400 242" fill="none" stroke="#22c55e" stroke-width="4"/>
  <text x="218" y="152" text-anchor="middle" fill="#86efac" font-family="monospace" font-size="10" font-weight="bold">SNAP-IN RUBBER GROMMET</text>

  <!-- CANivore + Termination Spec (442, 235) -->
  <g transform="translate(442,235)">
    <rect x="-56" y="-42" width="112" height="84" rx="8" fill="#1e3a8a" fill-opacity="0.4" stroke="#60a5fa" stroke-width="2.5"/>
    <rect x="26" y="-26" width="16" height="10" rx="3" fill="#22c55e"/>
    <text x="0" y="6" text-anchor="middle" fill="#dbeafe" font-family="monospace" font-size="10" font-weight="bold">120Ω TERM OK</text>
    <text x="0" y="32" text-anchor="middle" fill="#93c5fd" font-family="monospace" font-size="9">60Ω MEASURED ACROSS H/L</text>
  </g>
</svg>
`);

export const intakeStudentPhotoSvg = toDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420" width="640" height="420">
  <rect width="640" height="420" fill="#1f1712"/>
  <rect x="16" y="14" width="235" height="26" rx="6" fill="#18120e" stroke="#5c4735"/>
  <circle cx="30" cy="27" r="4" fill="#ef4444"/>
  <text x="42" y="31" fill="#faf4e8" font-family="monospace" font-size="11">PIT-CAM • INTAKE_PLATE.JPG</text>
  <polygon points="120,320 190,110 470,110 520,320" fill="#374151" fill-opacity="0.6" stroke="#9ca3af" stroke-width="3"/>
  <!-- Stress crack on polycarb -->
  <path d="M 240 165 L 270 200 L 255 235 L 285 268" fill="none" stroke="#ef4444" stroke-width="3.5"/>
  <text x="270" y="150" text-anchor="middle" fill="#fca5a5" font-family="monospace" font-size="10" font-weight="bold">POLYCARB CRACK (NO GUSSET)</text>
  <!-- Belt slack -->
  <path d="M 380 140 Q 435 190 480 155" fill="none" stroke="#facc15" stroke-width="5" stroke-dasharray="8 4"/>
  <text x="440" y="128" text-anchor="middle" fill="#fde047" font-family="monospace" font-size="10" font-weight="bold">BELT SKIP / SLACK</text>
</svg>
`);

export const intakeCadSchematicSvg = toDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420" width="640" height="420">
  <rect width="640" height="420" fill="#131924"/>
  <rect x="16" y="16" width="330" height="26" rx="4" fill="#1e293b" stroke="#facc15" stroke-opacity="0.6"/>
  <text x="26" y="33" fill="#fde047" font-family="monospace" font-size="11" font-weight="bold">846 CAD PDF • OVER_BUMPER_INTAKE (PAGE 9)</text>
  <polygon points="120,320 190,110 470,110 520,320" fill="#0f172a" stroke="#38bdf8" stroke-width="2.5"/>
  <!-- Gusset -->
  <polygon points="220,175 290,175 290,245" fill="#22c55e" fill-opacity="0.3" stroke="#22c55e" stroke-width="2"/>
  <text x="265" y="155" text-anchor="middle" fill="#86efac" font-family="monospace" font-size="10" font-weight="bold">3mm AL GUSSET + 12" MAX EXT</text>
  <!-- Tight HTD Belt -->
  <line x1="380" y1="145" x2="480" y2="145" stroke="#60a5fa" stroke-width="5"/>
  <text x="435" y="128" text-anchor="middle" fill="#93c5fd" font-family="monospace" font-size="10">HTD 5mm • 4mm DEFLECTION</text>
</svg>
`);
