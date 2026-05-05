import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface FeatureCardProps {
  id: string | number;
  icon: React.ReactNode;
  title: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
}

export function FeatureCard({ icon, title, isActive, onClick }: FeatureCardProps) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -10, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.95 }}
      style={{
        width: '280px',
        height: '380px',
        flexShrink: 0,
        display: 'grid',
        placeContent: 'center',
        padding: '2rem',
        borderRadius: '1.25rem',
        border: isActive ? '2px solid #facc15' : '1px solid rgba(253, 186, 116, 0.2)',
        background: isActive ? 'rgba(253, 186, 116, 0.1)' : 'rgba(20, 20, 20, 0.6)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: isActive ? '0 0 30px rgba(250, 204, 21, 0.2)' : '0 10px 30px rgba(0,0,0,0.3)',
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {isActive && (
        <motion.div 
          layoutId="active-glow"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at center, rgba(250, 204, 21, 0.1) 0%, transparent 70%)',
            pointerEvents: 'none'
          }}
        />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          width: '90px', 
          height: '90px', 
          borderRadius: '50%', 
          background: 'rgba(253, 186, 116, 0.1)', 
          border: '1px solid rgba(253, 186, 116, 0.3)',
          fontSize: '2.5rem'
        }}>
          {icon}
        </div>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'white', margin: 0 }}>
          {title}
        </h3>
        <div style={{ 
          fontSize: '0.875rem', 
          color: isActive ? '#facc15' : 'rgba(255, 255, 255, 0.4)',
          fontWeight: 500
        }}>
          {isActive ? 'Active' : 'Click to View'}
        </div>
      </div>
    </motion.div>
  );
}

export function ShuffleFeatureCards({ features }: { features: Omit<FeatureCardProps, 'isActive' | 'onClick'>[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCardClick = (index: number) => {
    setActiveIndex(index);
    setIsExpanded(true);
  };

  const activeFeature = features[activeIndex];

  return (
    <div style={{
      width: '100%',
      padding: '4rem 0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4rem'
    }}>
      {/* Scrollable Container */}
      <div style={{
        width: '100%',
        overflowX: 'auto',
        padding: '2rem',
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
        display: 'flex',
        justifyContent: features.length <= 3 ? 'center' : 'flex-start',
        gap: '2rem'
      }}>
        <div style={{
          display: 'flex',
          gap: '2rem',
          padding: '0 2rem'
        }}>
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.id}
              {...feature}
              isActive={activeIndex === index}
              onClick={() => handleCardClick(index)}
            />
          ))}
        </div>
      </div>

      {/* Description Panel */}
      <AnimatePresence mode="wait">
        {isExpanded && (
          <motion.div 
            key={activeFeature.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4 }}
            style={{
              width: '90%',
              maxWidth: '900px',
              padding: '3.5rem',
              borderRadius: '2rem',
              border: '1px solid rgba(253, 186, 116, 0.2)',
              background: 'rgba(15, 15, 15, 0.8)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '3rem',
              position: 'relative',
              boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
              flexWrap: 'wrap'
            }}
          >
            <button 
              onClick={() => setIsExpanded(false)}
              style={{
                position: 'absolute',
                top: '2rem',
                right: '2rem',
                background: 'rgba(255,255,255,0.05)',
                border: 'none',
                color: 'white',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '1.25rem'
              }}
            >
              ×
            </button>
            
            <div style={{ 
              fontSize: '4rem',
              background: 'rgba(253, 186, 116, 0.1)',
              width: '120px',
              height: '120px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '2rem',
              border: '1px solid rgba(253, 186, 116, 0.2)'
            }}>
              {activeFeature.icon}
            </div>

            <div style={{ flex: 1, minWidth: '300px' }}>
              <h3 style={{ fontSize: '2.5rem', color: 'white', margin: '0 0 1rem 0', fontWeight: 700 }}>
                {activeFeature.title}
              </h3>
              <p style={{ fontSize: '1.35rem', color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.6, margin: 0 }}>
                {activeFeature.description}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
