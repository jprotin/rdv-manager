import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';

const ERROR_MESSAGES = {
  'auth/invalid-credential':     'Email ou mot de passe incorrect.',
  'auth/user-not-found':         'Aucun compte associé à cet email.',
  'auth/wrong-password':         'Mot de passe incorrect.',
  'auth/too-many-requests':      'Trop de tentatives. Réessayez dans quelques minutes.',
  'auth/user-disabled':          'Ce compte a été désactivé.',
  'auth/network-request-failed': 'Erreur réseau. Vérifiez votre connexion.',
};

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(ERROR_MESSAGES[err.code] ?? 'Une erreur est survenue. Réessayez.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-ink-900">RDV Manager</h1>
          <p className="text-ink-500 mt-1 text-sm">Connectez-vous pour accéder à votre espace</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-ink-100 p-6 flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-ink-700">
              Adresse email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-ink-200 rounded-xl px-4 py-2.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 transition"
              placeholder="vous@exemple.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-ink-700">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-ink-200 rounded-xl px-4 py-2.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white font-semibold rounded-xl py-2.5 transition-colors"
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
