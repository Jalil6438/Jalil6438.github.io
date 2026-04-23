import { useLayoutEffect, useRef, useState } from "react";

// Mushaf line — base font is deliberately large; each line measures its own
// natural width against the container and shrinks only if it would overflow,
// so short lines render big without clipping long ones.
export default function MushafAutoLine({ lineText, fontFamily, isCenter, color, baseSize = 68, onClick, className }) {
  const ref = useRef(null);
  const [size, setSize] = useState(baseSize);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const m = document.createElement("div");
    m.style.cssText = `position:absolute;top:-9999px;left:-9999px;visibility:hidden;white-space:nowrap;direction:rtl;font-family:'${fontFamily}',serif;font-size:${baseSize}px`;
    m.textContent = lineText;
    document.body.appendChild(m);
    const containerW = Math.max(1, el.clientWidth - 2);
    const naturalW = m.scrollWidth;
    document.body.removeChild(m);
    setSize(naturalW > containerW ? Math.max(14, baseSize * (containerW / naturalW)) : baseSize);
  }, [lineText, fontFamily, baseSize]);
  return (
    <div ref={ref} className={className} onClick={onClick} style={{direction:"rtl",display:"flex",justifyContent:isCenter?"center":"space-between",alignItems:"center",width:"100%",maxWidth:"min(680px,99vw)",marginInline:"auto",fontFamily:`'${fontFamily}',serif`,fontSize:`${size}px`,color,padding:"6px 2px",whiteSpace:"nowrap",gap:isCenter?"0.25em":0,cursor:onClick?"pointer":"default"}}>
      {lineText.split(" ").map((w,wi)=>(<span key={wi}>{w}</span>))}
    </div>
  );
}
