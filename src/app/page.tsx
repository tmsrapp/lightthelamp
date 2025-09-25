'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [emailError, setEmailError] = useState('');
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
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('User signed in, redirecting to dashboard');
          router.push('/dashboard');
        }
      });
      
      // Check current session
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('Session check result:', { session: session?.user?.email, error });
      
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
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <div className="text-4xl font-bold text-white">🏒</div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Light The Lamp</h1>
          <p className="text-gray-600 text-lg">NHL Fantasy League</p>
        </div>

        {/* Auth Form */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 shadow-lg">
          <form onSubmit={handleAuth} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={handleEmailChange}
                className={`w-full px-4 py-3 bg-white border rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent ${
                  emailError 
                    ? 'border-red-400 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="Enter your real email address"
              />
              {emailError && (
                <p className="mt-1 text-sm text-red-600">{emailError}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={handlePasswordChange}
                className={`w-full px-4 py-3 bg-white border rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent ${
                  passwordError 
                    ? 'border-red-400 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="Enter your password"
              />
              {passwordError && (
                <p className="mt-1 text-sm text-red-600">{passwordError}</p>
              )}
            </div>

            {isSignUp && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required={isSignUp}
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  className={`w-full px-4 py-3 bg-white border rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent ${
                    passwordError && confirmPassword
                      ? 'border-red-400 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="Confirm your password"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !!emailError || !!passwordError}
              className="w-full bg-white hover:bg-gray-50 disabled:bg-gray-100 text-blue-600 disabled:text-gray-400 font-semibold py-3 px-4 rounded-lg border border-blue-600 disabled:border-gray-300 transition duration-200 ease-in-out transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setPassword('');
                  setConfirmPassword('');
                  setEmailError('');
                  setPasswordError('');
                  setMessage('');
                }}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium transition duration-200"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>
          </form>

          {message && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              message.includes('error') || message.includes('Error') || message.includes('Invalid') || message.includes('already exists')
                ? 'bg-red-50 text-red-700 border border-red-200' 
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              {message}
            </div>
          )}
        </div>

        {/* Setup Instructions */}
        {(!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'your_supabase_project_url') && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">🚀 Setup Required</h3>
            <p className="text-yellow-700 text-sm mb-3">
              To enable authentication, please configure your Supabase credentials:
            </p>
            <ol className="text-yellow-700 text-sm space-y-1 text-left">
              <li>1. Create a project at <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline">supabase.com</a></li>
              <li>2. Copy your project URL and anon key</li>
              <li>3. Update .env.local with your credentials</li>
              <li>4. Restart the development server</li>
            </ol>
          </div>
        )}

        {/* Features Preview */}
        <div className="text-center text-gray-600 text-sm space-y-2">
          <p>🏆 Join leagues for your favorite NHL team</p>
          <p>⚡ Pick players and earn points based on performance</p>
          <p>🔄 Snake draft ensures fair player selection</p>
        </div>
      </div>
    </div>
  );
}
