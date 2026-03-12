import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import FormField from '../components/ui/FormField';

const Login = () => {
  const navigate = useNavigate();
  
  const handleLogin = (e) => {
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
          <h1 className="auth-title">Log in to ZeroShare</h1>
          <p className="auth-desc">
            Welcome back! Please enter your details.
          </p>
        </div>
        
        <form onSubmit={handleLogin} className="auth-form">
          <FormField label="Email">
            <Input type="email" placeholder="Enter your email" required />
          </FormField>
          
          <FormField label="Password">
            <Input type="password" placeholder="••••••••" required />
          </FormField>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '-var(--space-2)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" style={{ accentColor: 'var(--color-accent)' }} />
              Remember me
            </label>
            <a href="#" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-accent)', fontWeight: 'var(--font-weight-medium)' }}>Forgot password?</a>
          </div>

          <Button type="submit" variant="primary" fullWidth style={{ marginTop: 'var(--space-2)' }}>
            Sign into your account
          </Button>
        </form>
        
        <div className="auth-footer">
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            Don't have an account?{' '}
            <span 
              style={{ color: 'var(--color-accent)', fontWeight: 'var(--font-weight-medium)', cursor: 'pointer' }} 
              onClick={() => navigate('/signup')}
            >
              Sign up
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
