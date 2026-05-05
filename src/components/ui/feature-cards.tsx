import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';

export interface FeatureCardProps {
  id: string | number;
  icon: React.ReactNode;
  title: string;
  description: string;
  position: string;
  handleShuffle: () => void;
  onExpand: () => void;
  isExpanded: boolean;
}

export function FeatureCard({ handleShuffle, icon, title, description, position, onExpand, isExpanded }: FeatureCardProps) {
  const dragRef = useRef(0);
  const isFront = position === "front";
  const isHidden = position.startsWith("hidden");

  return (
    <motion.div
      style={{
        zIndex: position === "front" ? 3 : position === "middle" ? 2 : position === "back" ? 1 : 0,
        position: 'absolute',
        top: 0,
        left: 0,
        width: '350px',
        height: '450px',
        display: 'grid',
        placeContent: 'center',
        padding: '2rem',
        borderRadius: '1rem',
        border: '1px solid rgba(253, 186, 116, 0.2)',
        background: 'rgba(20, 20, 20, 0.65)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        userSelect: 'none',
        pointerEvents: isHidden ? 'none' : 'auto',
        opacity: isHidden ? 0 : 1,
        cursor: isFront ? (isExpanded ? 'grab' : 'pointer') : 'auto',
      }}
      animate={{
        rotate: position === "front" ? "-4deg" : position === "middle" ? "0deg" : position === "back" ? "4deg" : "0deg",
        x: position === "front" ? "0%" : position === "middle" ? "20%" : position === "back" ? "40%" : "20%",
        y: position === "front" ? "0%" : position === "middle" ? "5%" : position === "back" ? "10%" : "5%",
        scale: position === "front" ? 1 : position === "middle" ? 0.95 : position === "back" ? 0.9 : 0.8,
      }}
      drag={isFront ? "x" : false}
      dragElastic={0.35}
      dragConstraints={{
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
      onDragStart={(e, info) => {
        dragRef.current = info.point.x;
      }}
      onDragEnd={(e, info) => {
        if (Math.abs(dragRef.current - info.point.x) > 100) {
          handleShuffle();
        }
        dragRef.current = 0;
      }}
      onClick={(e) => {
        if (isFront && !isExpanded && Math.abs(dragRef.current) < 5) {
          onExpand();
        }
      }}
      whileTap={isFront ? { scale: 0.98 } : {}}
      transition={{ duration: 0.4, ease: "easeInOut" }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', textAlign: 'center' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          width: '100px', 
          height: '100px', 
          borderRadius: '50%', 
          background: 'rgba(253, 186, 116, 0.1)', 
          border: '1px solid rgba(253, 186, 116, 0.3)',
          fontSize: '3rem'
        }}>
          {icon}
        </div>
        <h3 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'white', margin: 0 }}>
          {title}
        </h3>
        
        {isFront && !isExpanded && (
          <div style={{ 
            marginTop: '2rem', 
            fontSize: '0.875rem', 
            color: '#facc15', 
            opacity: 0.8,
            animation: 'pulse 2s infinite'
          }}>
            Click to View Details or Swipe to Shuffle
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function ShuffleFeatureCards({ features }: { features: Omit<FeatureCardProps, 'position' | 'handleShuffle' | 'onExpand' | 'isExpanded'>[] }) {
  const initialPositions = features.map((_, index) => {
    if (index === 0) return "front";
    if (index === 1) return "middle";
    if (index === 2) return "back";
    return `hidden${index}`;
  });

  const [positions, setPositions] = useState(initialPositions);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleShuffle = () => {
    setIsExpanded(false);
    setPositions((prev) => {
      const newPositions = [...prev];
      const front = newPositions.shift();
      if (front) newPositions.push(front);
      return newPositions;
    });
  };

  const activeIndex = positions.indexOf("front");
  const activeFeature = features[activeIndex !== -1 ? activeIndex : 0];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      minHeight: '600px',
      padding: '4rem 2rem',
      overflow: 'hidden',
    }}>
      <motion.div 
        animate={{ 
          x: isExpanded ? -250 : 0,
        }}
        transition={{ duration: 0.5, ease: "anticipate" }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4rem',
          position: 'relative',
          width: '100%',
          maxWidth: '1200px'
        }}
      >
        <div style={{
          position: 'relative',
          width: '350px',
          height: '450px',
          flexShrink: 0
        }}>
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.id}
              {...feature}
              handleShuffle={handleShuffle}
              position={positions[index]}
              onExpand={() => setIsExpanded(true)}
              isExpanded={isExpanded}
            />
          ))}
        </div>

        <motion.div 
          key={activeFeature.id}
          initial={{ opacity: 0, x: 50, scale: 0.9 }}
          animate={{ 
            opacity: isExpanded ? 1 : 0, 
            x: isExpanded ? 0 : 50,
            scale: isExpanded ? 1 : 0.9,
            pointerEvents: isExpanded ? 'auto' : 'none'
          }}
          transition={{ duration: 0.4, delay: isExpanded ? 0.2 : 0 }}
          style={{
            width: '100%',
            maxWidth: '500px',
            padding: '3rem',
            borderRadius: '1.5rem',
            border: '1px solid rgba(253, 186, 116, 0.2)',
            background: 'rgba(20, 20, 20, 0.4)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '1.5rem',
            position: 'relative'
          }}
        >
          <button 
            onClick={() => setIsExpanded(false)}
            style={{
              position: 'absolute',
              top: '1.5rem',
              right: '1.5rem',
              background: 'rgba(255,255,255,0.05)',
              border: 'none',
              color: 'white',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              opacity: 0.7
            }}
          >
            ×
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <span style={{ fontSize: '3rem' }}>{activeFeature.icon}</span>
            <h3 style={{ fontSize: '2.25rem', color: 'white', margin: 0, fontWeight: 700 }}>{activeFeature.title}</h3>
          </div>
          <p style={{ fontSize: '1.25rem', color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.7, margin: 0 }}>
            {activeFeature.description}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
