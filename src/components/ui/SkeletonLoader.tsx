export const SkeletonLoader = () => {
  return (
    <div className="animate-fade-in">
      <div
        className="skeleton skeleton-text"
        style={{ width: "200px", margin: "0 auto 20px", height: "40px" }}
      />
      <div className="stats-grid">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="skeleton skeleton-card"
            style={{ height: "100px" }}
          />
        ))}
      </div>
      <div className="users-grid">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
    </div>
  );
};
