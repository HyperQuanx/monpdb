import { NavLink } from "react-router-dom";
import styles from "./Footer.module.css";

function Footer() {
  return (
    <footer className={styles.footer}>
      <nav className={styles.nav} aria-label="Main navigation">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            isActive ? `${styles.link} ${styles.active}` : styles.link
          }
        >
          Home
        </NavLink>
      </nav>
    </footer>
  );
}

export default Footer;
