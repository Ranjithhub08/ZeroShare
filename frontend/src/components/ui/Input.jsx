import React from 'react';

const Input = React.forwardRef(({ className = '', hasError = false, ...props }, ref) => {
  const classes = [
    'input-field',
    hasError ? 'input-error' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <input
      ref={ref}
      className={classes}
      {...props}
    />
  );
});

Input.displayName = 'Input';
export default Input;
