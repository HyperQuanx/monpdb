import { NavLink, useLocation } from "react-router-dom";
import { getHeaderTitle } from "../../app/menuSections";
import { Button } from "../../shared/ui";
import styles from "./Header.module.css";

function Header({ isMenuOpen, menuSections, onOpenMenu, work }) {
  const { pathname } = useLocation();
  const headerTitle = getHeaderTitle(pathname, work?.title, menuSections);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <NavLink to="/" className={styles.brand}>
          <img
            className={styles.brandIcon}
            src="/defaultImage/monp_main_icon.png"
            alt=""
            aria-hidden="true"
          />
          <span className={styles.brandText}>MONP</span>
        </NavLink>

        <h1 className={styles.title}>{headerTitle}</h1>

        {!work ? (
          <Button
            aria-controls="site-menu"
            aria-expanded={isMenuOpen}
            aria-label="메뉴 열기"
            className={styles.menuButton}
            size="icon"
            variant="ghost"
            onClick={onOpenMenu}
          >
            <span className={styles.menuLine} />
            <span className={styles.menuLine} />
          </Button>
        ) : (
          <span aria-hidden="true" className={styles.headerSpacer} />
        )}
      </div>
    </header>
  );
}

export default Header;
