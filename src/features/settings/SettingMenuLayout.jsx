import { Outlet, useLoaderData } from "react-router-dom";

function SettingMenuLayout() {
  const menuItem = useLoaderData();

  return <Outlet context={{ menuItem }} />;
}

export default SettingMenuLayout;
