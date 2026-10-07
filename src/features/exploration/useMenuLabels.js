import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { menuQueryKeys } from "../../data/repositories/appRepositories";

/** "섹션 · 메뉴" labels for result metadata and the menu filter. */
export const useMenuLabels = (menus) => {
  const treeQuery = useQuery({
    networkMode: "always",
    queryKey: menuQueryKeys.tree(),
    queryFn: () => menus.listTree(),
  });
  const tree = useMemo(() => treeQuery.data ?? [], [treeQuery.data]);
  const labels = useMemo(
    () =>
      new Map(
        tree.flatMap((section) =>
          section.items.map((item) => [item.id, `${section.label} · ${item.label}`]),
        ),
      ),
    [tree],
  );
  return { labels, tree };
};
