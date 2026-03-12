import React, { useState, useRef, useEffect } from 'react';

const DropdownMenu = ({ trigger, items = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} className="dropdown-container">
      <div className="dropdown-trigger" onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>

      {isOpen && (
        <div className="dropdown-menu animate-slide-up">
          {items.map((item, idx) => (
            <React.Fragment key={idx}>
              {item.type === 'divider' ? (
                <div className="dropdown-divider" />
              ) : (
                <button
                  className={`dropdown-item ${item.danger ? 'danger' : ''}`}
                  onClick={() => {
                    item.onClick && item.onClick();
                    setIsOpen(false);
                  }}
                >
                  {item.icon && <item.icon size={16} />}
                  {item.label}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

export default DropdownMenu;
