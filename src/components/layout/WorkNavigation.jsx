import { useState } from "react";
import {
  Archive,
  Clock3,
  DatabaseBackup,
  House,
  LibraryBig,
  Menu,
  Network,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import {
  getMenuItemId,
  menuSections as defaultMenuSections,
} from "../../app/menuSections";
import {
  menuManagePath,
  workHomePath,
  workManagePath,
  workMenuPath,
  workArchivePath,
  workBackupPath,
  workRecentPath,
  workRelationsPath,
  workSearchPath,
} from "../../app/paths";
import { Sheet } from "../../shared/ui";
import styles from "./WorkNavigation.module.css";

const getLinkClassName = ({ isActive }) =>
  `${styles.menuLink} ${isActive ? styles.activeLink : ""}`;

export function WorkMenuTree({
  menuSections = defaultMenuSections,
  onNavigate,
  variant = "sheet",
  workId,
}) {
  const [activeSectionId, setActiveSectionId] = useState(null);
  const isSidebar = variant === "sidebar";

  return (
    <nav
      aria-label={isSidebar ? "작품 메뉴" : "메뉴 카테고리"}
      className={`${styles.menuTree} ${isSidebar ? styles.sidebarTree : styles.sheetTree}`}
    >
      {menuSections.map((section) => {
        const isExpanded = isSidebar || activeSectionId === section.id;
        const panelId = `${variant}-menu-section-${section.id}`;
        const links = section.items ?? section.links ?? [];

        return (
          <section className={styles.menuSection} key={section.id}>
            {isSidebar ? (
              <h2 className={styles.sidebarSectionTitle}>{section.label}</h2>
            ) : (
              <button
                aria-controls={panelId}
                aria-expanded={isExpanded}
                className={styles.sectionTrigger}
                type="button"
                onClick={() =>
                  setActiveSectionId((current) =>
                    current === section.id ? null : section.id,
                  )
                }
              >
                <span>{section.label}</span>
                <span
                  aria-hidden="true"
                  className={`${styles.sectionIcon} ${isExpanded ? styles.sectionIconOpen : ""}`}
                />
              </button>
            )}

            <div
              className={styles.linkPanel}
              hidden={!isExpanded}
              id={panelId}
            >
              {isExpanded
                ? links.map((link) => {
                    const menuItemId = getMenuItemId(link);
                    return (
                      <NavLink
                        aria-label={`${section.label} · ${link.label}`}
                        className={getLinkClassName}
                        key={menuItemId}
                        to={workMenuPath(workId, section.id, menuItemId)}
                        onClick={onNavigate}
                      >
                        {link.label}
                      </NavLink>
                    );
                  })
                : null}
            </div>
          </section>
        );
      })}
    </nav>
  );
}

export function WorkSidebar({ menuSections, work }) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <span>Current project</span>
        <strong>{work.title}</strong>
      </div>
      {/* Desktop has no bottom navigation, so exploration lives here. */}
      <nav aria-label="작품 탐색" className={styles.sidebarUtilities}>
        <NavLink className={styles.manageLink} to={workSearchPath(work.id)}>
          <Search aria-hidden="true" size={17} />
          검색
        </NavLink>
        <NavLink className={styles.manageLink} to={workRecentPath(work.id)}>
          <Clock3 aria-hidden="true" size={17} />
          최근 항목
        </NavLink>
        <NavLink className={styles.manageLink} to={workRelationsPath(work.id)}>
          <Network aria-hidden="true" size={17} />
          관계 탐색
        </NavLink>
        <NavLink className={styles.manageLink} to={workArchivePath(work.id)}>
          <Archive aria-hidden="true" size={17} />
          보관함
        </NavLink>
        <NavLink className={styles.manageLink} to={workBackupPath(work.id)}>
          <DatabaseBackup aria-hidden="true" size={17} />
          백업
        </NavLink>
      </nav>
      <WorkMenuTree
        menuSections={menuSections}
        variant="sidebar"
        workId={work.id}
      />
      <div className={styles.sidebarUtilities}>
        <Link className={styles.manageLink} to={workManagePath()}>
          <LibraryBig aria-hidden="true" size={17} />
          작품 관리
        </Link>
        <Link className={styles.manageLink} to={menuManagePath()}>
          <SlidersHorizontal aria-hidden="true" size={17} />
          메뉴 관리
        </Link>
      </div>
    </aside>
  );
}

export function WorkBottomNavigation({ isMenuOpen, onOpenMenu, workId }) {
  return (
    <nav aria-label="작품 빠른 탐색" className={styles.bottomNavigation}>
      <NavLink end className={getLinkClassName} to={workHomePath(workId)}>
        <House aria-hidden="true" size={20} />
        <span>작품 홈</span>
      </NavLink>
      <NavLink className={getLinkClassName} to={workSearchPath(workId)}>
        <Search aria-hidden="true" size={20} />
        <span>검색</span>
      </NavLink>
      <NavLink className={getLinkClassName} to={workRecentPath(workId)}>
        <Clock3 aria-hidden="true" size={20} />
        <span>최근</span>
      </NavLink>
      <button
        aria-controls="site-menu"
        aria-expanded={isMenuOpen}
        aria-label="메뉴"
        className={styles.bottomMenuButton}
        type="button"
        onClick={onOpenMenu}
      >
        <Menu aria-hidden="true" size={20} />
        <span>메뉴</span>
      </button>
    </nav>
  );
}

export function AdaptiveNavigation({
  isMenuOpen,
  menuSections,
  onCloseMenu,
  onOpenMenu,
  work,
}) {
  return (
    <>
      <Sheet
        closeLabel="메뉴 닫기"
        id="site-menu"
        open={isMenuOpen}
        title={work ? `${work.title} 메뉴` : "전체 메뉴"}
        onClose={onCloseMenu}
      >
        <nav aria-label="작품 도구" className={styles.utilityNavigation}>
          <Link to="/" onClick={onCloseMenu}>
            작품 선택
          </Link>
          <Link to={workManagePath()} onClick={onCloseMenu}>
            작품 관리
          </Link>
          <Link to={menuManagePath()} onClick={onCloseMenu}>
            메뉴 관리
          </Link>
          {work ? (
            <>
              <Link to={workRelationsPath(work.id)} onClick={onCloseMenu}>
                관계 탐색
              </Link>
              <Link to={workArchivePath(work.id)} onClick={onCloseMenu}>
                보관함
              </Link>
              <Link to={workBackupPath(work.id)} onClick={onCloseMenu}>
                백업
              </Link>
            </>
          ) : null}
        </nav>
        {work ? (
          <WorkMenuTree
            menuSections={menuSections}
            workId={work.id}
            onNavigate={onCloseMenu}
          />
        ) : null}
      </Sheet>

      {work ? (
        <WorkBottomNavigation
          isMenuOpen={isMenuOpen}
          workId={work.id}
          onOpenMenu={onOpenMenu}
        />
      ) : null}
    </>
  );
}
