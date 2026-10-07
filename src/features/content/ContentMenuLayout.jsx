import { Outlet, useLoaderData } from "react-router-dom";

function ContentMenuLayout() {
  const menuItem = useLoaderData();

  return <Outlet context={{ menuItem }} />;
}

export default ContentMenuLayout;
