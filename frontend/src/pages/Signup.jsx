import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import FormField from '../components/ui/FormField';

const Signup = () => {
  const navigate = useNavigate();
  
  const handleSignup = (e) => {
    e.preventDefault();
    navigate('/dashboard');
  };

  return (
    <div className="auth-layout">
      <div className="auth-glow" />

      <div className="auth-card animate-slide-up">
        <div className="auth-logo-wrapper">
          <div className="auth-logo">
            <Shield size={24} color="var(--color-brand-contrast)" />
          </div>
        </div>

        <div className="auth-header">
          <h1 className="auth-title">Create an account</h1>
          <p className="auth-desc">
            Start managing your data consents today.
          </p>
        </div>
        
        <form onSubmit={handleSignup} className="auth-form">
          <FormField label="Full Name">
            <Input type="text" placeholder="John Doe" required />
          </FormField>

          <FormField label="Email">
            <Input type="email" placeholder="you@example.com" required />
          </FormField>
          
          <FormField label="Password">
            <Input type="password" placeholder="••••••••" required />
          </FormField>

          <Button type="submit" variant="primary" fullWidth style={{ marginTop: 'var(--space-2)' }}>
            Create account
          </Button>
        </form>
        
        <div className="auth-footer">
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            Already have an account?{' '}
            <span 
              style={{ color: 'var(--color-accent)', fontWeight: 'var(--font-weight-medium)', cursor: 'pointer' }} 
              onClick={() => navigate('/login')}
            >
              Log in
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
