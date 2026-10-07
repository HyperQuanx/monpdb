import { Outlet, useLoaderData } from "react-router-dom";

function CharacterMenuLayout() {
  const menuItem = useLoaderData();

  return <Outlet context={{ menuItem }} />;
}

export default CharacterMenuLayout;
