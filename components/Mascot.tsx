interface MascotProps {
  mood?: "happy" | "excited";
  size?: number;
  message?: string;
  className?: string;
}

// Petite mascotte "Pépin" — une orange souriante aux couleurs de l'app,
// dessinée en SVG pur (pas d'image à héberger). Deux humeurs : contente au
// quotidien, et surexcitée pour les célébrations de badges.
export default function Mascot({
  mood = "happy",
  size = 76,
  message,
  className = "",
}: MascotProps) {
  const excited = mood === "excited";

  return (
    <div className={`flex items-end gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="mascotShine" cx="35%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {excited && (
          <>
            <path
              d="M14 30 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z"
              fill="#F4A261"
            />
            <path
              d="M104 22 l2.4 5.6 5.6 2.4 -5.6 2.4 -2.4 5.6 -2.4 -5.6 -5.6 -2.4 5.6 -2.4z"
              fill="#F4A261"
            />
          </>
        )}

        {excited ? (
          <>
            <path
              d="M32 58 C20 44, 14 34, 18 24"
              stroke="#C96A52"
              strokeWidth="7"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M88 58 C100 44, 106 34, 102 24"
              stroke="#C96A52"
              strokeWidth="7"
              strokeLinecap="round"
              fill="none"
            />
          </>
        ) : (
          <>
            <path
              d="M30 70 C20 72, 14 78, 16 86"
              stroke="#C96A52"
              strokeWidth="7"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M90 70 C100 72, 106 78, 104 86"
              stroke="#C96A52"
              strokeWidth="7"
              strokeLinecap="round"
              fill="none"
            />
          </>
        )}

        {/* Feuille */}
        <path
          d="M60 14 C52 6, 40 8, 38 18 C48 20, 58 22, 60 14Z"
          fill="#81B29A"
        />
        <path
          d="M60 14 C68 6, 80 8, 82 18 C72 20, 62 22, 60 14Z"
          fill="#6A9A82"
        />

        {/* Corps */}
        <circle cx="60" cy="66" r="42" fill="#E07A5F" />
        <circle cx="60" cy="66" r="42" fill="url(#mascotShine)" opacity="0.35" />

        {/* Joues */}
        <ellipse cx="38" cy="76" rx="7" ry="5" fill="#C96A52" opacity="0.55" />
        <ellipse cx="82" cy="76" rx="7" ry="5" fill="#C96A52" opacity="0.55" />

        {/* Yeux */}
        {excited ? (
          <>
            <path
              d="M40 60 Q46 52 52 60"
              stroke="#3D405B"
              strokeWidth="4.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M68 60 Q74 52 80 60"
              stroke="#3D405B"
              strokeWidth="4.5"
              strokeLinecap="round"
              fill="none"
            />
          </>
        ) : (
          <>
            <circle cx="46" cy="60" r="5.5" fill="#3D405B" />
            <circle cx="44.3" cy="58" r="1.6" fill="#ffffff" />
            <circle cx="74" cy="60" r="5.5" fill="#3D405B" />
            <circle cx="72.3" cy="58" r="1.6" fill="#ffffff" />
          </>
        )}

        {/* Bouche */}
        {excited ? (
          <path d="M44 82 Q60 100 76 82 Q60 92 44 82Z" fill="#3D405B" />
        ) : (
          <path
            d="M46 82 Q60 92 74 82"
            stroke="#3D405B"
            strokeWidth="4.5"
            strokeLinecap="round"
            fill="none"
          />
        )}
      </svg>

      {message && (
        <div className="relative mb-1 max-w-[190px] rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-xs font-medium leading-snug text-campus-ink shadow-md">
          {message}
        </div>
      )}
    </div>
  );
}
