import { Outlet, useLoaderData } from "react-router-dom";

/** Passes the loader's active menu item to specialized menu pages. */
function MenuOutletLayout() {
  const menuItem = useLoaderData();

  return <Outlet context={{ menuItem }} />;
}

export default MenuOutletLayout;
