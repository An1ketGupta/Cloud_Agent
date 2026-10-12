import AuthForm from '../components/auth/AuthForm.jsx';
import AuthProductStory from '../components/auth/AuthProductStory.jsx';

export default function AuthPage({ mode, onModeChange, onSubmit, busy, error, notice }) {
  return (
    <main className="min-h-screen w-full bg-[#08090a] text-[#f7f8f8] flex flex-col md:grid md:grid-cols-12 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#5e6ad2]/10 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-10 w-[500px] h-[500px] bg-[#828fff]/5 blur-[120px] pointer-events-none rounded-full" />
      <AuthProductStory />
      <AuthForm
        key={mode}
        mode={mode}
        onModeChange={onModeChange}
        onSubmit={onSubmit}
        busy={busy}
        error={error}
        notice={notice}
      />
    </main>
  );
}
