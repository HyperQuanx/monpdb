import { Navigate, useParams } from "react-router-dom";
import { characterDetailPath } from "./paths";

function LegacyCharacterDetailRedirect({ regionId, workId }) {
  const { characterId } = useParams();

  return (
    <Navigate
      replace
      to={characterDetailPath(workId, regionId, characterId)}
    />
  );
}

export default LegacyCharacterDetailRedirect;
