import { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { isHttpMode } from "../../data/http/config";
import { useOnline } from "../../data/http/connectivity";
import { httpClient } from "../../data/repositories/httpRepositories";
import styles from "./Main.module.css";

function Main() {
  const online = useOnline();
  const { pathname } = useLocation();
  const queryClient = useQueryClient();
  const offline = isHttpMode && !online;
  const editor = /\/(new|edit)$/.test(pathname) || ["/works/manage", "/menu/manage"].includes(pathname);
  useEffect(() => {
    if (!isHttpMode) return;
    if (online) queryClient.invalidateQueries();
    const timer = setInterval(() => { if (!online) httpClient.probe(); }, 15_000);
    return () => clearInterval(timer);
  }, [online, queryClient]);
  return (
    <main className={styles.main}>
      {offline ? <p role="status">오프라인 · 저장된 텍스트를 읽을 수 있습니다. 수정하려면 서버에 연결해 주세요.</p> : null}
      {offline && editor ? <p>편집은 온라인에서 가능합니다. <Link to="/">작품 선택으로 돌아가기</Link></p> : offline ? (
        <fieldset disabled style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}><Outlet /></fieldset>
      ) : <Outlet />}
    </main>
  );
}

export default Main;
