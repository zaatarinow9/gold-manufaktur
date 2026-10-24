import clsx from "clsx";

import { brandMarkPaths, brandMarkViewBox } from "@/components/brand/brandMark";

type BrandLoaderProps = {
  className?: string;
  label: string;
  size?: "md" | "lg";
};

/**
 * Loading state: the diamond from the logo with a light passing over it and
 * a thin gold ring tracing around. It fades in after a short delay so quick
 * page changes never flash it.
 */
export function BrandLoader({ className, label, size = "lg" }: BrandLoaderProps) {
  return (
    <div role="status" aria-live="polite" className={clsx("brand-loader", className)} data-size={size}>
      <div className="brand-loader-stage" aria-hidden="true">
        <svg className="brand-loader-ring" viewBox="0 0 100 100">
          <circle className="brand-loader-ring-track" cx="50" cy="50" r="46" />
          <circle className="brand-loader-ring-arc" cx="50" cy="50" r="46" pathLength="100" />
        </svg>
        <svg className="brand-loader-mark" viewBox={brandMarkViewBox}>
          <defs>
            <linearGradient id="brand-loader-sheen" x1="0" y1="0" x2="1" y2="0.35">
              <stop offset="0" stopColor="#8d6a33" />
              <stop offset="0.42" stopColor="#c9a35a" />
              <stop offset="0.5" stopColor="#fbecc4" />
              <stop offset="0.58" stopColor="#c9a35a" />
              <stop offset="1" stopColor="#8d6a33" />
              <animateTransform
                attributeName="gradientTransform"
                type="translate"
                from="-1 0"
                to="1 0"
                dur="2.2s"
                repeatCount="indefinite"
              />
            </linearGradient>
          </defs>
          <g fill="url(#brand-loader-sheen)">
            {brandMarkPaths.map((d) => (
              <path key={d.slice(0, 24)} d={d} />
            ))}
          </g>
        </svg>
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
