// Escenas ilustradas propias (no fotografías) para representar cada área
// de estudio de iMES: como no podemos usar fotos reales del centro, se
// opta por ilustraciones claras y con estilo propio, coherentes con el
// resto del sitio.

export function EscenaEdificiPlatja() {
  return (
    <svg viewBox="0 0 400 220" className="w-full">
      <rect width="400" height="140" fill="#7DD3FC" />
      <rect y="140" width="400" height="80" fill="#38BDF8" opacity="0.5" />
      <rect y="170" width="400" height="50" fill="#FDE68A" />
      <circle cx="340" cy="45" r="24" fill="#FEF08A" />
      {/* Edificio */}
      <rect x="60" y="70" width="200" height="100" rx="4" fill="#0B1D4D" />
      <rect x="75" y="85" width="30" height="30" fill="#7DD3FC" />
      <rect x="115" y="85" width="30" height="30" fill="#7DD3FC" />
      <rect x="155" y="85" width="30" height="30" fill="#7DD3FC" />
      <rect x="195" y="85" width="30" height="30" fill="#7DD3FC" />
      <rect x="75" y="125" width="30" height="30" fill="#7DD3FC" />
      <rect x="115" y="125" width="30" height="30" fill="#7DD3FC" />
      <rect x="155" y="125" width="30" height="30" fill="#FD5249" />
      <rect x="195" y="125" width="30" height="30" fill="#7DD3FC" />
      <rect x="140" y="150" width="40" height="20" fill="#FD5249" />
      {/* Palmeras */}
      <g>
        <rect x="290" y="130" width="6" height="40" fill="#78350F" />
        <circle cx="293" cy="120" r="16" fill="#16A34A" />
      </g>
      <g>
        <rect x="30" y="140" width="5" height="30" fill="#78350F" />
        <circle cx="32" cy="132" r="13" fill="#16A34A" />
      </g>
    </svg>
  );
}

export function EscenaArtDisseny() {
  return (
    <svg viewBox="0 0 200 160" className="h-full w-full">
      <rect width="200" height="160" fill="#FDF2F8" />
      <rect x="30" y="30" width="70" height="90" fill="#fff" stroke="#0B1D4D" strokeWidth="2" />
      <path d="M40 100 Q 60 60, 80 90 T 95 70" stroke="#FD5249" strokeWidth="3" fill="none" />
      <circle cx="55" cy="55" r="8" fill="#FBBF24" opacity="0.8" />
      <rect x="20" y="118" width="90" height="8" fill="#94A3B8" />
      <circle cx="140" cy="60" r="18" fill="#F472B6" />
      <circle cx="150" cy="90" r="10" fill="#60A5FA" />
      <circle cx="125" cy="95" r="7" fill="#FBBF24" />
    </svg>
  );
}

export function EscenaArtsEsceniques() {
  return (
    <svg viewBox="0 0 200 160" className="h-full w-full">
      <rect width="200" height="160" fill="#1E1B4B" />
      <rect x="0" y="0" width="24" height="160" fill="#7F1D1D" />
      <rect x="176" y="0" width="24" height="160" fill="#7F1D1D" />
      <ellipse cx="100" cy="125" rx="75" ry="12" fill="#312E81" opacity="0.6" />
      <circle cx="80" cy="95" r="9" fill="#FBCFE8" />
      <rect x="72" y="104" width="16" height="24" rx="5" fill="#FD5249" />
      <circle cx="115" cy="95" r="9" fill="#FBCFE8" />
      <rect x="107" y="104" width="16" height="24" rx="5" fill="#FBBF24" />
      <circle cx="100" cy="38" r="26" fill="#FDE68A" opacity="0.9" />
    </svg>
  );
}

export function EscenaAudiovisuals() {
  return (
    <svg viewBox="0 0 200 160" className="h-full w-full">
      <rect width="200" height="160" fill="#0F172A" />
      <rect x="55" y="60" width="70" height="50" rx="4" fill="#334155" />
      <circle cx="90" cy="85" r="16" fill="#1E293B" stroke="#60A5FA" strokeWidth="2" />
      <circle cx="90" cy="85" r="7" fill="#60A5FA" />
      <rect x="122" y="70" width="18" height="10" fill="#334155" />
      <rect x="45" y="65" width="10" height="40" fill="#475569" />
      <circle cx="160" cy="50" r="14" fill="#FD5249" opacity="0.9" />
      <rect x="152" y="60" width="16" height="4" fill="#FD5249" />
    </svg>
  );
}

export function EscenaProduccioMusical() {
  return (
    <svg viewBox="0 0 200 160" className="h-full w-full">
      <rect width="200" height="160" fill="#F0FDFA" />
      <rect x="30" y="90" width="140" height="45" rx="4" fill="#0F172A" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={i} x={40 + i * 18} y={95 + (i % 3) * 6} width="12" height={30 - (i % 3) * 6} fill={i % 2 ? "#34D399" : "#FD5249"} />
      ))}
      <circle cx="100" cy="55" r="20" fill="#0F172A" />
      <circle cx="100" cy="55" r="7" fill="#94A3B8" />
    </svg>
  );
}

export function EscenaInformatica() {
  return (
    <svg viewBox="0 0 200 160" className="h-full w-full">
      <rect width="200" height="160" fill="#ECFEFF" />
      <rect x="40" y="50" width="120" height="70" rx="4" fill="#0F172A" />
      <rect x="48" y="58" width="104" height="54" fill="#0EA5E9" opacity="0.15" />
      <rect x="55" y="66" width="40" height="4" fill="#34D399" />
      <rect x="55" y="76" width="60" height="4" fill="#60A5FA" />
      <rect x="55" y="86" width="30" height="4" fill="#FD5249" />
      <rect x="85" y="120" width="30" height="8" fill="#475569" />
      <rect x="70" y="128" width="60" height="6" rx="3" fill="#334155" />
    </svg>
  );
}

export function EscenaSanitat() {
  return (
    <svg viewBox="0 0 200 160" className="h-full w-full">
      <rect width="200" height="160" fill="#F0FDF4" />
      <circle cx="100" cy="60" r="26" fill="#fff" stroke="#34D399" strokeWidth="3" />
      <rect x="92" y="46" width="16" height="28" fill="#34D399" />
      <rect x="86" y="54" width="28" height="12" fill="#34D399" />
      <rect x="60" y="100" width="80" height="45" rx="6" fill="#fff" stroke="#94A3B8" strokeWidth="2" />
      <circle cx="80" cy="122" r="8" fill="#FED7AA" />
      <rect x="105" y="112" width="25" height="6" fill="#60A5FA" />
      <rect x="105" y="122" width="25" height="6" fill="#60A5FA" />
    </svg>
  );
}

export function EscenaComerc() {
  return (
    <svg viewBox="0 0 200 160" className="h-full w-full">
      <rect width="200" height="160" fill="#FFFBEB" />
      <rect x="30" y="90" width="140" height="6" fill="#94A3B8" />
      <circle cx="60" cy="70" r="9" fill="#FED7AA" />
      <rect x="52" y="79" width="16" height="24" rx="5" fill="#FD5249" />
      <circle cx="100" cy="65" r="9" fill="#FED7AA" />
      <rect x="92" y="74" width="16" height="24" rx="5" fill="#60A5FA" />
      <circle cx="140" cy="70" r="9" fill="#FED7AA" />
      <rect x="132" y="79" width="16" height="24" rx="5" fill="#34D399" />
      <rect x="60" y="30" width="80" height="40" rx="4" fill="#fff" stroke="#FBBF24" strokeWidth="2" />
      <path d="M68 60 L82 40 L96 55 L110 35 L124 50" stroke="#FD5249" strokeWidth="2.5" fill="none" />
    </svg>
  );
}

export function EscenaComunitat() {
  return (
    <svg viewBox="0 0 200 160" className="h-full w-full">
      <rect width="200" height="160" fill="#FDF4FF" />
      <circle cx="70" cy="70" r="10" fill="#FED7AA" />
      <rect x="60" y="80" width="20" height="30" rx="6" fill="#F472B6" />
      <circle cx="110" cy="60" r="8" fill="#FED7AA" />
      <rect x="102" y="68" width="16" height="24" rx="5" fill="#A78BFA" />
      <circle cx="140" cy="75" r="7" fill="#FED7AA" />
      <rect x="133" y="82" width="14" height="20" rx="4" fill="#34D399" />
      <path d="M55 120 Q 100 100, 150 120" stroke="#F472B6" strokeWidth="2" fill="none" strokeDasharray="4 4" />
    </svg>
  );
}
