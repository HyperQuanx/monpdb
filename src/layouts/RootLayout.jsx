import Header from "../components/layout/Header";
import Main from "../components/layout/Main";
import Footer from "../components/layout/Footer";
import styles from "./RootLayout.module.css";

function RootLayout() {
  return (
    <div className={styles.shell}>
      <Header />
      <Main />
      <Footer />
    </div>
  );
}

export default RootLayout;
