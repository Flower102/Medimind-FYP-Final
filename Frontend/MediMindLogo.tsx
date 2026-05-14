// MediMindLogo.tsx
// Logo icon that follows the text colour from its parent.
// PublicNav controls the logo colour using text-blue-600 / dark:text-blue-400.

type MediMindLogoProps = {
  size?: number;
};

export default function MediMindLogo({ size = 32 }: MediMindLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      {/* Main chat bubble shape */}
      <path
        d="M7 6.5C7 4.6 8.6 3 10.5 3h11C23.4 3 25 4.6 25 6.5v8.8c0 1.9-1.6 3.5-3.5 3.5h-7.2l-5.5 5.1c-.7.6-1.8.1-1.8-.8V6.5Z"
        fill="currentColor"
      />

      {/* Small highlight dot */}
      <path
        d="M13 10.5h6"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}