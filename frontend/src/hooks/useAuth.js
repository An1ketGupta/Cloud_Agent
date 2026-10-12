import { useEffect, useState } from 'react';
import { authApi } from '../api/authApi.js';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('signup');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    authApi
      .getProfile()
      .then(({ user: profile }) => {
        if (active) setUser(profile);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function changeMode(nextMode) {
    setMode(nextMode);
    setError('');
    setNotice('');
  }

  async function submit(values) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'signup') {
        await authApi.signUp(values);
        setMode('signin');
        setNotice('Account created successfully. Please sign in with your credentials.');
      } else {
        await authApi.signIn({ email: values.email, password: values.password });
        const { user: profile } = await authApi.getProfile();
        setUser(profile);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setError('');
    try {
      await authApi.signOut();
      setUser(null);
      setMode('signin');
      setNotice('Signed out successfully.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return { user, mode, loading, busy, error, notice, changeMode, submit, signOut };
}
