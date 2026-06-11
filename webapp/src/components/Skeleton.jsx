// Rectangle de chargement shimmer. width/height : nombre (px) ou string CSS.
const Skeleton = ({ width = '100%', height = 16, style }) => (
  <div className="skeleton" style={{ width, height, ...style }} aria-hidden="true" />
);

export default Skeleton;
