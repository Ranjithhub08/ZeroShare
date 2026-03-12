import React from 'react';

const FormField = ({ label, error, children, className = '' }) => {
  return (
    <div className={`form-field ${className}`}>
      {label && (
        <label className="form-field-label">
          {label}
        </label>
      )}
      {children}
      {error && (
        <span className="form-field-error">
          {error}
        </span>
      )}
    </div>
  );
};

export default FormField;
