import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';

const Signup = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />

      <div className="w-full max-w-md space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col items-center text-center">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 mb-6">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
          <p className="text-muted-foreground mt-2">Join ZeroShare and take control of your data</p>
        </div>
        
        <form onSubmit={handleSignup} className="space-y-6">
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="full-name">Full Name</Label>
              <Input
                id="full-name"
                placeholder="John Doe"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-muted/30 focus:bg-background transition-all"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-muted/30 focus:bg-background transition-all"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-muted/30 focus:bg-background transition-all"
              />
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Minimum 8 characters</p>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <div className="space-y-4">
            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                id="terms"
                required
                className="mt-1 h-4 w-4 rounded border-input bg-muted/30 text-primary ring-offset-background focus:ring-2 focus:ring-ring"
              />
              <Label htmlFor="terms" className="text-sm font-normal text-muted-foreground cursor-pointer leading-tight">
                I agree to the <a href="#" className="text-primary hover:underline">Terms of Service</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a>
              </Label>
            </div>

            <Button type="submit" disabled={loading} className="w-full h-11 text-base font-semibold">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...</> : 'Create Account'}
            </Button>
          </div>
        </form>
        
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <button 
            type="button"
            className="text-primary font-semibold hover:underline" 
            onClick={() => navigate('/login')}
          >
            Log in
          </button>
        </p>
      </div>
    </div>
  );
};

export default Signup;
