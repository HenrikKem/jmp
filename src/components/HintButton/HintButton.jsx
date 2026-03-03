import { useState, useRef, useEffect } from 'react';
import './HintButton.css';

function HintButton({ title, children, align = 'left', wide = false }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleOutsideClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  return (
    <div className="hint-button-wrapper" ref={wrapperRef}>
      <button
        type="button"
        className={`hint-btn${open ? ' active' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label={title || 'Hilfe'}
      >
        ?
      </button>
      {open && (
        <div className={`hint-popover hint-popover--${align}${wide ? ' hint-popover--wide' : ''}`}>
          {title && <div className="hint-popover-title">{title}</div>}
          <div className="hint-popover-content">{children}</div>
        </div>
      )}
    </div>
  );
}

export default HintButton;