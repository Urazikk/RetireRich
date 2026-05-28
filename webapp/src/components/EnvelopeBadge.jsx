import { getAccountTypeDef } from '../utils/accountTypes.js';

const EnvelopeBadge = ({ type }) => {
  const def = getAccountTypeDef(type);
  return (
    <span
      className="badge"
      style={{
        background: `${def.color}14`,
        color: def.color,
        border: `1px solid ${def.color}30`,
      }}
    >
      {type}
    </span>
  );
};

export default EnvelopeBadge;
