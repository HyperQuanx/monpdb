import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { isHttpMode } from "../data/http/config";
import { getAccessToken, subscribeSession, loginWithPassword, logoutPasswordSession } from "../data/http/passwordSession";
import { clearTextCaches } from "../data/cache/textCache";
import { markServerReachable } from "../data/http/connectivity";
import styles from "./PasswordGate.module.css";

export default function PasswordGate({ children, queryClient }) {
  const token = useSyncExternalStore(subscribeSession, getAccessToken, () => "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (isHttpMode && !token) {
      queryClient.clear();
      void clearTextCaches();
    }
  }, [token, queryClient]);
  if (!isHttpMode) return children;
  if (token) return <><div className={styles.exit}><button type="button" onClick={async () => { await logoutPasswordSession(); queryClient.clear(); await clearTextCaches(); window.location.reload(); }}>접속 종료</button></div>{children}</>;
  const submit = async (event) => {
    event.preventDefault();
    setPending(true); setError("");
    try { await loginWithPassword(password); setPassword(""); markServerReachable(true); }
    catch (reason) { setError(reason.status ? reason.message : "서버에 연결할 수 없습니다. 다시 시도해 주세요."); }
    finally { setPending(false); }
  };
  return <main className={styles.page}>
    <div className={styles.masthead}><strong className={styles.wordmark}>MONP</strong><span>Storage</span></div>
    <div className={styles.welcome}>
      <section className={styles.introduction} aria-label="MONP Storage">
        <p className={styles.eyebrow}>A space for your stories</p>
        <p className={styles.statement}>생각은 자유롭게.<br /><span>이야기는 선명하게.</span></p>
        <p className={styles.description}>흩어진 영감부터 하나의 세계까지.<br />당신의 이야기를 차분히 쌓아가는 공간.</p>
      </section>
      <form className={styles.card} onSubmit={submit}>
    <div className={styles.lock}><LockKeyhole size={20} strokeWidth={1.5} aria-hidden="true" /></div>
    <h1>비밀번호를 입력하세요</h1>
    <p>작품 공간에 접속하려면 비밀번호를 입력해 주세요.</p>
    <label htmlFor="access-password">비밀번호</label>
    <input id="access-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required maxLength={256} disabled={pending} />
    {error && <p className={styles.error} role="alert">{error}</p>}
    <button type="submit" disabled={pending}>{pending ? "확인 중…" : "접속"}<ArrowRight size={16} aria-hidden="true" /></button>
  </form></div><p className={styles.footer}>MONP Storage · 나만의 이야기를 위한 공간</p></main>;
}
