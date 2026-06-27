"use client";

import { useEffect, useRef } from "react";

export function PremiumEffects() {
  const cursorGlowRef = useRef<HTMLDivElement>(null);
  const scrollProgressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (cursorGlowRef.current) {
        cursorGlowRef.current.style.left = e.clientX + 'px';
        cursorGlowRef.current.style.top = e.clientY + 'px';
      }
    };

    const handleScroll = () => {
      if (scrollProgressRef.current) {
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (docHeight > 0) {
          const percent = (window.scrollY / docHeight) * 100;
          scrollProgressRef.current.style.width = percent + '%';
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <>
      <div ref={cursorGlowRef} className="cursor-glow" id="cursorGlow"></div>
      <div ref={scrollProgressRef} className="scroll-progress" id="scrollProgress"></div>
      
      <div className="shapes-container">
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
      </div>
    </>
  );
}
