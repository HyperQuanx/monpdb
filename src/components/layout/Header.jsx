import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { getHeaderTitle, menuSections } from "../../app/menuSections";
import styles from "./Header.module.css";

function Header() {
  const { pathname } = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState(null);
  const headerTitle = getHeaderTitle(pathname);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMenuOpen]);

  const handleMenuToggle = () => {
    if (isMenuOpen) {
      setActiveSectionId(null);
      setIsMenuOpen(false);
      return;
    }

    setIsMenuOpen(true);
  };

  const handleMenuClose = () => {
    setActiveSectionId(null);
    setIsMenuOpen(false);
  };

  const handleSectionToggle = (sectionId) => {
    setActiveSectionId((current) => (current === sectionId ? null : sectionId));
  };

  return (
    <header
      className={`${styles.header} ${isMenuOpen ? styles.headerOpen : ""}`}
    >
      <div className={styles.inner}>
        <NavLink to="/" className={styles.brand} onClick={handleMenuClose}>
          <img
            className={styles.brandIcon}
            src="/defaultImage/monp_main_icon.png"
            alt=""
            aria-hidden="true"
          />
          <span className={styles.brandText}>MONP</span>
        </NavLink>

        <h1 className={styles.title}>{headerTitle}</h1>

        <button
          className={`${styles.menuButton} ${isMenuOpen ? styles.menuButtonOpen : ""
            }`}
          type="button"
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          aria-controls="site-menu"
          aria-expanded={isMenuOpen}
          onClick={handleMenuToggle}
        >
          <span className={styles.menuLine} />
          <span className={styles.menuLine} />
        </button>
      </div>

      <div
        id="site-menu"
        className={`${styles.drawer} ${isMenuOpen ? styles.drawerOpen : ""}`}
        aria-hidden={!isMenuOpen}
      >
        {isMenuOpen && (
          <div className={styles.drawerPanel}>
            {menuSections.length > 0 ? (
              <nav className={styles.menuList} aria-label="Menu categories">
                {menuSections.map((section, sectionIndex) => {
                  const isActive = activeSectionId === section.id;

                  return (
                    <section
                      className={styles.menuSection}
                      key={section.id}
                      style={{ "--item-index": sectionIndex }}
                    >
                      <button
                        className={styles.sectionTrigger}
                        type="button"
                        aria-expanded={isActive}
                        onClick={() => handleSectionToggle(section.id)}
                      >
                        <span>{section.label}</span>
                        <span
                          className={`${styles.sectionIcon} ${isActive ? styles.sectionIconOpen : ""
                            }`}
                          aria-hidden="true"
                        />
                      </button>

                      <div
                        className={`${styles.linkPanel} ${isActive ? styles.linkPanelOpen : ""
                          }`}
                      >
                        <div className={styles.linkList}>
                          {section.links.map((link, linkIndex) => (
                            <NavLink
                              className={styles.menuLink}
                              key={link.path}
                              to={link.path}
                              style={{ "--link-index": linkIndex }}
                              onClick={handleMenuClose}
                            >
                              {link.label}
                            </NavLink>
                          ))}
                        </div>
                      </div>
                    </section>
                  );
                })}
              </nav>
            ) : (
              <div className={styles.emptyMenu}>
                <strong>Menu is ready.</strong>
                <span>Add categories to menuSections in Header.jsx.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
