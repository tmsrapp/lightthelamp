'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface User {
  id: string;
  email?: string;
}

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      // Skip auth check if Supabase is not configured
      if (process.env.NEXT_PUBLIC_SUPABASE_URL === 'your_supabase_project_url' || 
          !process.env.NEXT_PUBLIC_SUPABASE_URL) {
        console.log('Supabase not configured, skipping auth check');
        return;
      }
      
      console.log('Checking for existing user...');
      
      // Listen for auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        setUser(session?.user || null);
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('User signed in, redirecting to dashboard');
          router.push('/dashboard');
        }
      });
      
      // Check current session
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('Session check result:', { session: session?.user?.email, error });
      
      setUser(session?.user || null);
      
      if (session?.user) {
        console.log('User found in session, redirecting to dashboard');
        router.push('/dashboard');
      } else {
        console.log('No user found, staying on login page');
      }
      
      // Cleanup subscription on unmount
      return () => subscription.unsubscribe();
    };
    
    checkUser();
  }, [router]);

  // Email validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Check for common invalid email patterns
  const isEmailValidForSupabase = (email: string) => {
    // Check for common test domains that might be blocked
    const blockedDomains = ['example.com', 'test.com', 'localhost'];
    const domain = email.split('@')[1]?.toLowerCase();
    
    if (blockedDomains.includes(domain)) {
      return false;
    }
    
    return true;
  };

  // Password validation
  const validatePassword = (password: string) => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    return '';
  };

  // Real-time validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (value && !validateEmail(value)) {
      setEmailError('Please enter a valid email address');
    } else if (value && !isEmailValidForSupabase(value)) {
      setEmailError('Please use a real email address (not example.com, test.com, etc.)');
    } else {
      setEmailError('');
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    const error = validatePassword(value);
    setPasswordError(error);
    
    // Also validate confirm password if it exists
    if (confirmPassword && value !== confirmPassword) {
      setPasswordError('Passwords do not match');
    } else if (confirmPassword && value === confirmPassword) {
      setPasswordError('');
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConfirmPassword(value);
    if (value && password !== value) {
      setPasswordError('Passwords do not match');
    } else {
      setPasswordError('');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setEmailError('');
    setPasswordError('');

    // Check if Supabase is configured
    if (process.env.NEXT_PUBLIC_SUPABASE_URL === 'your_supabase_project_url' || 
        !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setMessage('Please configure your Supabase credentials in .env.local to enable authentication.');
      setLoading(false);
      return;
    }

    // Validate email
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    // Check if email is valid for Supabase
    if (!isEmailValidForSupabase(email)) {
      setEmailError('Please use a real email address (not example.com, test.com, etc.)');
      setLoading(false);
      return;
    }

    // Validate password
    const passwordValidationError = validatePassword(password);
    if (passwordValidationError) {
      setPasswordError(passwordValidationError);
      setLoading(false);
      return;
    }

    // For signup, validate password confirmation
    if (isSignUp) {
      if (password !== confirmPassword) {
        setPasswordError('Passwords do not match');
        setLoading(false);
        return;
      }
    }

    try {
      if (isSignUp) {
        console.log('Attempting signup with:', { email, password: '***' });
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`
          }
        });
        console.log('Signup response:', { data, error });
        if (error) throw error;
        
        if (data.user && !data.user.email_confirmed_at) {
          setMessage('✅ Account created! Please check your email and click the confirmation link, then you can sign in.');
          // Switch to sign in mode after successful signup
          setTimeout(() => {
            setIsSignUp(false);
            setPassword('');
            setConfirmPassword('');
          }, 3000);
        } else if (data.user && data.user.email_confirmed_at) {
          setMessage('✅ Account created and confirmed! You can now sign in.');
          setIsSignUp(false);
          setPassword('');
          setConfirmPassword('');
        } else {
          setMessage('✅ Account created successfully! You can now sign in.');
          setIsSignUp(false);
          setPassword('');
          setConfirmPassword('');
        }
      } else {
        console.log('Attempting signin with:', { email, password: '***' });
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        console.log('Signin response:', { data, error });
        if (error) throw error;
        
        console.log('Sign in successful, user:', data.user?.email);
        setMessage('Successfully signed in! Redirecting...');
        
        // The auth state change listener will handle the redirect
      }
    } catch (error: unknown) {
      console.error('Auth error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      if (errorMessage.includes('Invalid login credentials')) {
        setMessage('Invalid email or password. Please try again.');
      } else if (errorMessage.includes('User already registered')) {
        setMessage('An account with this email already exists. Please sign in instead.');
        setIsSignUp(false);
      } else if (errorMessage.includes('Email not confirmed')) {
        setMessage('Please check your email and click the confirmation link before signing in.');
      } else if (errorMessage.includes('Invalid email') || errorMessage.includes('is invalid')) {
        setMessage('Please use a real email address (not example.com, test.com, etc.)');
        setEmailError('Please use a real email address');
      } else if (errorMessage.includes('Password should be at least')) {
        setMessage('Password must be at least 6 characters long.');
      } else {
        setMessage(`Error: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => user ? router.push('/dashboard') : window.location.reload()}
              className="flex items-center space-x-2"
            >
              <div className="text-2xl">🚨</div>
              <h1 className="text-2xl font-bold">Light The Lamp</h1>
            </Button>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-muted-foreground hidden md:block">Welcome, {user.email}</span>
                  <Button 
                    variant="outline" 
                    onClick={() => router.push('/dashboard')}
                  >
                    Dashboard
                  </Button>
                </>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => setShowAuthModal(true)}
                  className="hidden md:block"
                >
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Light The Lamp
            <span className="text-primary block">Reimagined</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join leagues, pick players, and compete with friends in the ultimate hockey experience. 
            Snake drafts, live scoring, and real-time updates.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => { setShowAuthModal(true); setIsSignUp(false); }}>
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={() => { setShowAuthModal(true); setIsSignUp(true); }}>
              Create Account
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12">Why Choose Light The Lamp?</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <div className="text-4xl mb-4">🏆</div>
                <CardTitle>Join Any League</CardTitle>
                <CardDescription>
                  Create or join leagues for your favorite team. No restrictions, just pure hockey fun.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <div className="text-4xl mb-4">⚡</div>
                <CardTitle>Pick Players</CardTitle>
                <CardDescription>
                  Select players before each game and earn points based on their real-world performance.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <div className="text-4xl mb-4">🔄</div>
                <CardTitle>Snake Draft</CardTitle>
                <CardDescription>
                  Fair player selection with rotating draft order ensures everyone gets a chance at top players.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Auth Modal */}
      <div className={`fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 ${showAuthModal ? 'block' : 'hidden'}`}>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{isSignUp ? 'Create Account' : 'Sign In'}</CardTitle>
            <CardDescription>
              {isSignUp ? 'Join the ultimate hockey experience' : 'Welcome back to Light The Lamp'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="Enter your email address"
                />
                {emailError && (
                  <p className="text-sm text-destructive">{emailError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="Enter your password"
                />
                {passwordError && (
                  <p className="text-sm text-destructive">{passwordError}</p>
                )}
              </div>

              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    required={isSignUp}
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    placeholder="Confirm your password"
                  />
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !!emailError || !!passwordError}
                className="w-full"
              >
                {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setPassword('');
                    setConfirmPassword('');
                    setEmailError('');
                    setPasswordError('');
                    setMessage('');
                  }}
                >
                  {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </Button>
              </div>
            </form>

            {message && (
              <div className={`mt-4 p-3 rounded-lg text-sm ${
                message.includes('error') || message.includes('Error') || message.includes('Invalid') || message.includes('already exists')
                  ? 'bg-destructive/20 text-destructive border border-destructive/30' 
                  : 'bg-green-500/20 text-green-700 border border-green-500/30'
              }`}>
                {message}
              </div>
            )}

            <div className="mt-4 text-center">
              <Button
                variant="ghost"
                onClick={() => setShowAuthModal(false)}
                className="text-muted-foreground"
              >
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Setup Instructions */}
      {(!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'your_supabase_project_url') && (
        <section className="py-20 px-4">
          <div className="container mx-auto">
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-yellow-800">🚀 Setup Required</CardTitle>
                <CardDescription className="text-yellow-700">
                  To enable authentication, please configure your Supabase credentials:
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="text-yellow-700 text-sm space-y-1">
                  <li>1. Create a project at <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline">supabase.com</a></li>
                  <li>2. Copy your project URL and anon key</li>
                  <li>3. Update .env.local with your credentials</li>
                  <li>4. Restart the development server</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; 2024 Light The Lamp. Built with Next.js and Supabase.</p>
        </div>
      </footer>
    </div>
  );
}
