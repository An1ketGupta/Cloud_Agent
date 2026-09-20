import { useState, useEffect } from 'react';
import { authClient } from './auth';
import './App.css';

export default function App() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authClient.getSession().then((result) => {
      if (result.data?.session && result.data?.user) {
        setSession(result.data.session);
        setUser(result.data.user);
      }
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = isSignUp
      ? await authClient.signUp.email({ name: email.split('@')[0] || 'User', email, password })
      : await authClient.signIn.email({ email, password });

    if (result.error) {
      alert(result.error.message);
      return;
    }

    const sessionResult = await authClient.getSession();
    if (sessionResult.data?.session && sessionResult.data?.user) {
      setSession(sessionResult.data.session);
      setUser(sessionResult.data.user);
    }
  };

  const handleGoogleSignIn = async () => {
    const result = await authClient.signIn.social({
      provider: 'google',
      callbackURL: window.location.origin,
    });

    if (result.error) {
      alert(result.error.message);
    }
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    setSession(null);
    setUser(null);
  };

  if (loading) return <div>Loading...</div>;

  if (session && user) {
    return (
      <div>
        <h1>Logged in as {user.email}</h1>
        <div> Add Github for usage</div>
        <a></a>
        <button onClick={handleSignOut}>Sign Out</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>{isSignUp ? 'Sign Up' : 'Sign In'}</h1>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <button type="submit">
        {isSignUp ? 'Sign Up' : 'Sign In'}
      </button>

      <button type="button" onClick={handleGoogleSignIn}>
        Continue with Google
      </button>

      <p>
        {isSignUp ? (
          <>
            Already have an account?{' '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setIsSignUp(false);
              }}
            >
              Sign in
            </a>
          </>
        ) : (
          <>
            Don't have an account?{' '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setIsSignUp(true);
              }}
            >
              Sign up
            </a>
          </>
        )}
      </p>
    </form>
  );
}