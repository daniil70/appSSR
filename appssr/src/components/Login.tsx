import { useState, type FormEvent } from 'react';
import type { PublicUser } from '../../shared/types';
import { api } from '../api';
import { AlabugaLogo, Icons } from '../icons';

export function Login({ onLogin }: { onLogin: (u: PublicUser) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = mode === 'login' ? await api.auth.login(login, password) : await api.auth.register(login, password, displayName);
      if (res.ok && res.user) onLogin(res.user);
      else setError(res.message ?? 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-hero">
        <AlabugaLogo light />
        <div>
          <h1>AppSSR</h1>
          <p>Единая точка входа для установки, запуска и обновления программного обеспечения SSR и быстрого перехода к аналитическим таблицам Synology.</p>
          <ul>
            <li>
              <span className="dot">
                <Icons.download size={14} />
              </span>
              Установка программ из GitLab в одно действие
            </li>
            <li>
              <span className="dot">
                <Icons.open size={14} />
              </span>
              Запуск установленных и встроенных программ
            </li>
            <li>
              <span className="dot">
                <Icons.table size={14} />
              </span>
              Ссылки на таблицы с аналитикой в Synology
            </li>
          </ul>
        </div>
        <div style={{ opacity: 0.6, fontSize: 12 }}>Макет без БД · v0.1</div>
      </div>
      <div className="login-form-wrap">
        <form className="login-card" onSubmit={submit}>
          <h2>{mode === 'login' ? 'Вход в AppSSR' : 'Регистрация'}</h2>
          <p className="hint">Без авторизации доступ к каталогу закрыт.</p>
          <div className="login-tabs">
            <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
              Войти
            </button>
            <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>
              Зарегистрироваться
            </button>
          </div>
          {error && <div className="form-error">{error}</div>}
          {mode === 'register' && (
            <div className="field">
              <label htmlFor="displayName">Имя и фамилия</label>
              <input id="displayName" className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Иван Петров" />
            </div>
          )}
          <div className="field">
            <label htmlFor="login">Логин</label>
            <input id="login" className="input" value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" autoFocus required />
          </div>
          <div className="field">
            <label htmlFor="password">Пароль</label>
            <input id="password" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? <span className="spinner" /> : <Icons.login />}
            {mode === 'login' ? 'Войти' : 'Создать учётную запись'}
          </button>
          <div className="demo-creds">
            Демо-доступ администратора: <code>admin</code> / <code>admin</code>
          </div>
        </form>
      </div>
    </div>
  );
}
