import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';

export interface FeatureCardProps {
  id: string | number;
  icon: React.ReactNode;
  title: string;
  description: string;
  position: string;
  handleShuffle: () => void;
  onViewMore: () => void;
}

export function FeatureCard({ handleShuffle, icon, title, description, position, onViewMore }: FeatureCardProps) {
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
        border: '1px solid rgba(253, 186, 116, 0.2)', // Gold tint
        background: 'rgba(20, 20, 20, 0.65)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        userSelect: 'none',
        pointerEvents: isHidden ? 'none' : 'auto',
        opacity: isHidden ? 0 : 1,
        cursor: isFront ? 'grab' : 'pointer',
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
        if (isFront && Math.abs(dragRef.current) < 5) {
          handleShuffle();
        }
      }}
      whileTap={isFront ? { cursor: "grabbing" } : {}}
      transition={{ duration: 0.35 }}
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
        
        {isFront && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onViewMore();
              }}
              style={{
                background: 'rgba(253, 186, 116, 0.2)',
                border: '1px solid rgba(253, 186, 116, 0.4)',
                color: '#facc15',
                padding: '0.5rem 1.5rem',
                borderRadius: '9999px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.875rem'
              }}
            >
              View More
            </button>
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'rgba(255, 255, 255, 0.5)',
              opacity: 0.8
            }}>
              ← Swipe or Click to shuffle →
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function ShuffleFeatureCards({ features }: { features: Omit<FeatureCardProps, 'position' | 'handleShuffle' | 'onViewMore'>[] }) {
  const initialPositions = features.map((_, index) => {
    if (index === 0) return "front";
    if (index === 1) return "middle";
    if (index === 2) return "back";
    return `hidden${index}`;
  });

  const [positions, setPositions] = useState(initialPositions);
  const [showDescription, setShowDescription] = useState(false);

  const handleShuffle = () => {
    setShowDescription(false);
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
      gap: '4rem',
      width: '100%',
      minHeight: '600px',
      padding: '4rem 2rem',
      overflow: 'hidden',
      flexWrap: 'wrap'
    }}>
      <div style={{
        position: 'relative',
        width: '350px',
        height: '450px',
      }}>
        {features.map((feature, index) => (
          <FeatureCard
            key={feature.id}
            {...feature}
            handleShuffle={handleShuffle}
            position={positions[index]}
            onViewMore={() => setShowDescription(true)}
          />
        ))}
      </div>

      <motion.div 
        key={activeFeature.id}
        initial={{ opacity: 0, x: 20, scale: 0.95 }}
        animate={{ 
          opacity: showDescription ? 1 : 0, 
          x: showDescription ? 0 : 40,
          scale: showDescription ? 1 : 0.95,
          pointerEvents: showDescription ? 'auto' : 'none'
        }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{
          width: '100%',
          maxWidth: '450px',
          padding: '2.5rem',
          borderRadius: '1rem',
          border: '1px solid rgba(253, 186, 116, 0.2)',
          background: 'rgba(20, 20, 20, 0.4)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '1rem',
          position: 'relative'
        }}
      >
        <button 
          onClick={() => setShowDescription(false)}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '1.5rem',
            cursor: 'pointer',
            opacity: 0.5
          }}
        >
          ×
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '2rem' }}>{activeFeature.icon}</span>
          <h3 style={{ fontSize: '2rem', color: 'white', margin: 0 }}>{activeFeature.title}</h3>
        </div>
        <p style={{ fontSize: '1.125rem', color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.6, margin: 0 }}>
          {activeFeature.description}
        </p>
      </motion.div>
    </div>
  );
}
