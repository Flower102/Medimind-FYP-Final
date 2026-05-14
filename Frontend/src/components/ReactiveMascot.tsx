"use client";

/**
 * Reactive login mascot.
 *
 * - Characters follow the mouse smoothly.
 * - Orange eyes are aligned.
 * - Yellow has two eyes.
 * - Purple expression is cleaner.
 * - Password focus or visible password makes them turn shy.
 */

import { useEffect, useMemo, useRef, useState } from "react";

export type FocusMode = "none" | "email" | "password";

type EyeOffset = {
  x: number;
  y: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function ReactiveMascot({
  focusMode = "none",
  isPasswordVisible = false,
}: {
  focusMode?: FocusMode;
  isPasswordVisible?: boolean;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);

  const targetEyeRef = useRef<EyeOffset>({ x: 0, y: 0 });
  const currentEyeRef = useRef<EyeOffset>({ x: 0, y: 0 });

  const [eye, setEye] = useState<EyeOffset>({ x: 0, y: 0 });

  const isFocused = focusMode !== "none";
  const isShy = focusMode === "password" || isPasswordVisible;
  const isEmail = focusMode === "email" && !isShy;

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const box = boxRef.current;
      if (!box) return;

      const rect = box.getBoundingClientRect();

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const normalX = clamp(
        (event.clientX - centerX) / (rect.width / 2),
        -1,
        1
      );

      const normalY = clamp(
        (event.clientY - centerY) / (rect.height / 2),
        -1,
        1
      );

      targetEyeRef.current = {
        x: normalX * 14,
        y: normalY * 10,
      };
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  useEffect(() => {
    let animationFrameId = 0;

    const animate = () => {
      const current = currentEyeRef.current;
      const target = targetEyeRef.current;

      const nextX = current.x + (target.x - current.x) * 0.14;
      const nextY = current.y + (target.y - current.y) * 0.14;

      currentEyeRef.current = {
        x: nextX,
        y: nextY,
      };

      setEye({
        x: Number(nextX.toFixed(2)),
        y: Number(nextY.toFixed(2)),
      });

      animationFrameId = window.requestAnimationFrame(animate);
    };

    animationFrameId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const eyeOffset = useMemo<EyeOffset>(() => {
    if (isShy) {
      return {
        x: -5 + eye.x * 0.55,
        y: 5 + eye.y * 0.45,
      };
    }

    if (isEmail) {
      return {
        x: 5 + eye.x * 0.65,
        y: 1 + eye.y * 0.5,
      };
    }

    return {
      x: eye.x,
      y: eye.y,
    };
  }, [eye, isEmail, isShy]);

  const purpleTransform = useMemo(() => {
    const baseX = isShy ? -8 : isEmail ? 4 : 0;
    const baseY = isShy ? 7 : 0;
    const baseRotate = isShy ? -7 : isEmail ? 1 : 0;

    const moveX = baseX + eye.x * 0.22;
    const moveY = baseY + eye.y * 0.12;
    const rotate = baseRotate + eye.x * 0.08;

    return `translate(${moveX} ${moveY}) rotate(${rotate} 160 145)`;
  }, [eye, isEmail, isShy]);

  const blackTransform = useMemo(() => {
    const baseX = isShy ? -2 : isEmail ? 3 : 0;
    const baseY = isShy ? 5 : 0;
    const baseRotate = isShy ? -2 : isEmail ? 1 : 0;

    const moveX = baseX + eye.x * 0.16;
    const moveY = baseY + eye.y * 0.1;
    const rotate = baseRotate + eye.x * 0.05;

    return `translate(${moveX} ${moveY}) rotate(${rotate} 230 155)`;
  }, [eye, isEmail, isShy]);

  const yellowTransform = useMemo(() => {
    const baseX = isShy ? 3 : isEmail ? 3 : 0;
    const baseY = isShy ? 5 : 0;

    const moveX = baseX + eye.x * 0.1;
    const moveY = baseY + eye.y * 0.08;

    return `translate(${moveX} ${moveY})`;
  }, [eye, isEmail, isShy]);

  const orangeTransform = useMemo(() => {
    const baseY = isShy ? 4 : 0;

    const moveX = eye.x * 0.08;
    const moveY = baseY + eye.y * 0.06;

    return `translate(${moveX} ${moveY})`;
  }, [eye, isShy]);

  const purpleMouth = isShy
    ? "M 142 112 Q 154 103 166 112"
    : "M 142 112 Q 154 119 166 112";

  const orangeMouth = isShy
    ? "M 111 190 Q 123 184 135 190"
    : "M 111 187 Q 123 197 135 187";

  const yellowMouth = isShy
    ? "M 270 176 Q 289 168 308 176"
    : "M 272 174 L 308 174";

  return (
    <div
      ref={boxRef}
      className={[
        "flex h-72 items-center justify-center overflow-hidden rounded-3xl bg-white/85 shadow-sm transition-all duration-300",
        "dark:bg-slate-950/80",
        isFocused || isPasswordVisible
          ? "border border-blue-400 ring-4 ring-blue-500/20 dark:border-blue-500 dark:ring-blue-400/20"
          : "border border-slate-200 dark:border-slate-800",
      ].join(" ")}
    >
      <svg
        width="380"
        height="260"
        viewBox="0 0 380 260"
        role="img"
        aria-label="MediMind animated login mascot"
      >
        <title>MediMind animated login mascot</title>

        <defs>
          <linearGradient id="purpleFill" x1="115" y1="45" x2="205" y2="210">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#5B21B6" />
          </linearGradient>

          <linearGradient id="blackFill" x1="200" y1="95" x2="260" y2="215">
            <stop offset="0%" stopColor="#111827" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          <linearGradient id="orangeFill" x1="55" y1="145" x2="210" y2="220">
            <stop offset="0%" stopColor="#FB923C" />
            <stop offset="100%" stopColor="#FF7A1A" />
          </linearGradient>

          <linearGradient id="yellowFill" x1="250" y1="135" x2="320" y2="215">
            <stop offset="0%" stopColor="#FACC15" />
            <stop offset="100%" stopColor="#EAB308" />
          </linearGradient>

          <filter
            id="softMascotShadow"
            x="-25%"
            y="-25%"
            width="150%"
            height="160%"
          >
            <feDropShadow
              dx="0"
              dy="16"
              stdDeviation="14"
              floodColor="#0F172A"
              floodOpacity="0.16"
            />
          </filter>
        </defs>

        <g filter="url(#softMascotShadow)">
          <g transform={purpleTransform}>
            <rect
              x="118"
              y="50"
              width="92"
              height="160"
              rx="18"
              fill="url(#purpleFill)"
            />

            <path
              d="M 138 78 Q 160 68 190 76"
              stroke="white"
              strokeWidth="6"
              strokeLinecap="round"
              opacity="0.16"
            />

            <circle cx="144" cy="98" r="11" fill="white" />
            <circle cx="178" cy="98" r="11" fill="white" />

            <g transform={`translate(${eyeOffset.x} ${eyeOffset.y})`}>
              <circle cx="144" cy="98" r="4" fill="#111827" />
              <circle cx="178" cy="98" r="4" fill="#111827" />
            </g>

            {isShy && (
              <path
                d="M 134 86 Q 160 77 188 86"
                stroke="#111827"
                strokeWidth="5"
                strokeLinecap="round"
                opacity="0.75"
              />
            )}

            <path
              d={purpleMouth}
              stroke="#111827"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
            />
          </g>

          <g transform={blackTransform}>
            <rect
              x="205"
              y="100"
              width="66"
              height="110"
              rx="13"
              fill="url(#blackFill)"
            />

            <path
              d="M 220 118 Q 240 110 260 119"
              stroke="white"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.08"
            />

            <circle cx="224" cy="128" r="10" fill="white" />
            <circle cx="252" cy="128" r="10" fill="white" />

            <g
              transform={`translate(${eyeOffset.x * 0.75} ${
                eyeOffset.y * 0.75
              })`}
            >
              <circle cx="224" cy="128" r="3.6" fill="#111827" />
              <circle cx="252" cy="128" r="3.6" fill="#111827" />
            </g>
          </g>

          <g transform={yellowTransform}>
            <path
              d="M 250 210 L 250 166 Q 250 137 283 137 Q 316 137 316 166 L 316 210 Z"
              fill="url(#yellowFill)"
            />

            <g
              transform={`translate(${eyeOffset.x * 0.4} ${
                eyeOffset.y * 0.35
              })`}
            >
              <circle cx="278" cy="164" r="4.2" fill="#111827" />
              <circle cx="294" cy="164" r="4.2" fill="#111827" />
            </g>

            <path
              d={yellowMouth}
              stroke="#2563EB"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
            />
          </g>

          <g transform={orangeTransform}>
            <path
              d="M 60 210 L 60 196 Q 60 143 125 143 Q 191 143 205 210 Z"
              fill="url(#orangeFill)"
            />

            <g
              transform={`translate(${eyeOffset.x * 0.45} ${
                eyeOffset.y * 0.35
              })`}
            >
              <circle cx="112" cy="178" r="6" fill="#111827" />
              <circle cx="136" cy="178" r="6" fill="#111827" />
            </g>

            <path
              d={orangeMouth}
              stroke="#111827"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
            />
          </g>

          {isShy && (
            <>
              <ellipse
                cx="108"
                cy="170"
                rx="13"
                ry="7"
                fill="#FCA5A5"
                opacity="0.38"
              />

              <ellipse
                cx="274"
                cy="158"
                rx="10"
                ry="6"
                fill="#FCA5A5"
                opacity="0.28"
              />
            </>
          )}
        </g>
      </svg>
    </div>
  );
}