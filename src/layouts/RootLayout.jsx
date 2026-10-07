import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouteLoaderData } from "react-router-dom";
import Header from "../components/layout/Header";
import Main from "../components/layout/Main";
import {
  AdaptiveNavigation,
  WorkSidebar,
} from "../components/layout/WorkNavigation";
import {
  menuQueryKeys,
  menuRepository,
} from "../data/repositories/appRepositories";
import { useRecordRecentView } from "../shared/navigation/recentViews";
import styles from "./RootLayout.module.css";

function RootLayout({ workScoped = false }) {
  useRecordRecentView();
  const loadedWork = useRouteLoaderData("work");
  const work = workScoped ? loadedWork : null;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuQuery = useQuery({
    networkMode: "always",
    queryKey: menuQueryKeys.tree(),
    queryFn: () => menuRepository.listTree(),
  });
  const menuSections = menuQuery.data ?? [];

  return (
    <div
      className={styles.shell}
      style={{
        "--active-footer-height": work ? "var(--footer-height)" : "0px",
        "--work-accent": work?.accentColor,
      }}
    >
      <Header
        isMenuOpen={isMenuOpen}
        menuSections={menuSections}
        work={work}
        onOpenMenu={() => setIsMenuOpen(true)}
      />
      <div className={styles.body}>
        {work ? (
          <WorkSidebar menuSections={menuSections} work={work} />
        ) : null}
        <Main />
      </div>
      <AdaptiveNavigation
        isMenuOpen={isMenuOpen}
        menuSections={menuSections}
        work={work}
        onCloseMenu={() => setIsMenuOpen(false)}
        onOpenMenu={() => setIsMenuOpen(true)}
      />
    </div>
  );
}

export default RootLayout;
