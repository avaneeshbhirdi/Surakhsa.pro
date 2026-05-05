import React from "react";

// Types
interface GlassEffectProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  href?: string;
  onClick?: () => void;
  target?: string;
}

// Glass Effect Wrapper Component
export const GlassEffect: React.FC<GlassEffectProps> = ({
  children,
  className = "",
  style = {},
  href,
  onClick,
  target = "_blank",
}) => {
  const glassStyle: React.CSSProperties = {
    boxShadow: "0 6px 6px rgba(0, 0, 0, 0.2), 0 0 20px rgba(0, 0, 0, 0.1)",
    transitionTimingFunction: "cubic-bezier(0.175, 0.885, 0.32, 2.2)",
    position: 'relative',
    display: 'flex',
    fontWeight: 600,
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 700ms',
    borderRadius: '1.5rem',
    ...style,
  };

  const layerStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 'inherit',
  };

  const content = (
    <div
      className={className}
      style={glassStyle}
      onClick={onClick}
    >
      {/* Glass Layers */}
      <div
        style={{
          ...layerStyle,
          zIndex: 0,
          overflow: 'hidden',
          backdropFilter: "blur(3px)",
          filter: "url(#glass-distortion)",
          isolation: "isolate",
        }}
      />
      <div
        style={{
          ...layerStyle,
          zIndex: 10,
          background: "rgba(255, 255, 255, 0.15)", // Slightly less white for dark mode
        }}
      />
      <div
        style={{
          ...layerStyle,
          zIndex: 20,
          overflow: 'hidden',
          boxShadow: "inset 2px 2px 1px 0 rgba(255, 255, 255, 0.3), inset -1px -1px 1px 1px rgba(255, 255, 255, 0.2)",
        }}
      />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 30, width: '100%' }}>
        {children}
      </div>
    </div>
  );

  return href ? (
    <a href={href} target={target} rel="noopener noreferrer" style={{ display: 'block', textDecoration: 'none' }}>
      {content}
    </a>
  ) : (
    content
  );
};

// Button Component
export const GlassButton: React.FC<{ children: React.ReactNode; href?: string; onClick?: () => void; style?: React.CSSProperties }> = ({
  children,
  href,
  onClick,
  style = {}
}) => (
  <GlassEffect
    href={href}
    onClick={onClick}
    style={{
      padding: '1.5rem 2.5rem',
      color: 'var(--color-gold-light)',
      ...style
    }}
  >
    <div
      style={{
        transition: 'all 700ms',
        transitionTimingFunction: "cubic-bezier(0.175, 0.885, 0.32, 2.2)",
        textAlign: 'center',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(0.95)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {children}
    </div>
  </GlassEffect>
);

// SVG Filter Component
export const GlassFilter: React.FC = () => (
  <svg style={{ display: "none" }}>
    <filter
      id="glass-distortion"
      x="0%"
      y="0%"
      width="100%"
      height="100%"
      filterUnits="objectBoundingBox"
    >
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.001 0.005"
        numOctaves="1"
        seed="17"
        result="turbulence"
      />
      <feComponentTransfer in="turbulence" result="mapped">
        <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
        <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
        <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
      </feComponentTransfer>
      <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
      <feSpecularLighting
        in="softMap"
        surfaceScale="5"
        specularConstant="1"
        specularExponent="100"
        lightingColor="white"
        result="specLight"
      >
        <fePointLight x="-200" y="-200" z="300" />
      </feSpecularLighting>
      <feComposite
        in="specLight"
        operator="arithmetic"
        k1="0"
        k2="1"
        k3="1"
        k4="0"
        result="litImage"
      />
      <feDisplacementMap
        in="SourceGraphic"
        in2="softMap"
        scale="200"
        xChannelSelector="R"
        yChannelSelector="G"
      />
    </filter>
  </svg>
);
