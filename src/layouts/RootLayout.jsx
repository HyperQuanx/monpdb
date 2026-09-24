import Header from "../components/layout/Header";
import Main from "../components/layout/Main";
import styles from "./RootLayout.module.css";

function RootLayout() {
  return (
    <div className={styles.shell}>
      <Header />
      <Main />
    </div>
  );
}

export default RootLayout;
