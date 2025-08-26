
import React, { useState, useCallback, useRef, useEffect } from 'react';

interface CompassProps {
  direction: number;
  setDirection: (dir: number) => void;
  disabled?: boolean;
}

const Compass: React.FC<CompassProps> = ({ direction, setDirection, disabled = false }) => {
  const compassRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleInteraction = useCallback((e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (disabled || !compassRef.current) return;
    
    const rect = compassRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const angle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
    const newDirection = Math.round((angle + 450) % 360);
    setDirection(newDirection);
  }, [setDirection, disabled]);

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (disabled) return;
    setIsDragging(true);
    handleInteraction(e);
  };
  
  const handleMouseUp = () => setIsDragging(false);
  
  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      handleInteraction(e as any);
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, handleInteraction]);

  return (
    <svg 
      ref={compassRef}
      viewBox="0 0 100 100" 
      className={`w-32 h-32 touch-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      onMouseDown={handleMouseDown}
    >
      <circle cx="50" cy="50" r="48" fill="#15191e" stroke="#3abff8" strokeOpacity="0.3" strokeWidth="2" />
      
      {['N', 'E', 'S', 'W'].map((d, i) => (
        <text key={d} x="50" y={i % 2 === 0 ? "12" : "54"} transform={`rotate(${i * 90} 50 50)`}
          fill="#a6adbb" fontSize="10" textAnchor="middle" alignmentBaseline="middle">
          {d}
        </text>
      ))}

      <g transform={`rotate(${direction} 50 50)`}>
        <polygon points="50,15 55,50 45,50" fill="#f87272" />
        <polygon points="50,85 55,50 45,50" fill="#3abff8" />
        <circle cx="50" cy="50" r="5" fill="#1d232a" stroke="#a6adbb" strokeWidth="1" />
      </g>
    </svg>
  );
};

export default Compass;
