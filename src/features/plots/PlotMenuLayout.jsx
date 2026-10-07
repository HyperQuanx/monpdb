import { Outlet, useLoaderData } from "react-router-dom";

function PlotMenuLayout() {
  const menuItem = useLoaderData();

  return <Outlet context={{ menuItem }} />;
}

export default PlotMenuLayout;
