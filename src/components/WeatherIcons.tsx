export function LocationArrow({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20.2 3.8 10.9 21a1.1 1.1 0 0 1-2-.15l-2.2-6.6-6.6-2.2a1.1 1.1 0 0 1-.15-2L17.2.8a2.1 2.1 0 0 1 3 2.99Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="9" fill="#ffc93c" />
      <g stroke="#ffc93c" strokeLinecap="round" strokeWidth="3">
        <path d="M24 5v6" />
        <path d="M24 37v6" />
        <path d="M5 24h6" />
        <path d="M37 24h6" />
        <path d="m10.6 10.6 4.2 4.2" />
        <path d="m33.2 33.2 4.2 4.2" />
        <path d="m37.4 10.6-4.2 4.2" />
        <path d="m14.8 33.2-4.2 4.2" />
      </g>
    </svg>
  );
}

function CloudIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path
        d="M15 34c-5 0-9-3.8-9-8.5 0-4.3 3.4-7.9 7.8-8.4A13.3 13.3 0 0 1 26.2 9c6.8 0 12.4 5.1 13 11.6 4.2.8 7.4 4.4 7.4 8.7 0 4.9-4.1 8.7-9.2 8.7H15Z"
        fill="#c8d0d8"
      />
    </svg>
  );
}

function RainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <CloudIcon />
      <g stroke="#4f9cf4" strokeLinecap="round" strokeWidth="3">
        <path d="m17 37-2 4" />
        <path d="m26 37-2 4" />
        <path d="m35 37-2 4" />
      </g>
    </svg>
  );
}

function PartlyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <g transform="translate(5 2)">
        <SunIcon />
      </g>
      <path
        d="M16 36c-5 0-9-3.6-9-8 0-4.1 3.2-7.5 7.4-7.9A12.7 12.7 0 0 1 26 12c6.5 0 11.7 4.8 12.4 11 4 .8 7 4.1 7 8.2 0 4.6-3.9 8.3-8.8 8.3H16Z"
        fill="#d4d9de"
      />
    </svg>
  );
}
