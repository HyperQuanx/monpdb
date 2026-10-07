import { Outlet, useLoaderData } from "react-router-dom";

function WorldMenuLayout() {
  const menuItem = useLoaderData();

  return <Outlet context={{ menuItem }} />;
}

export default WorldMenuLayout;
