export const SkeletonLoader = () => (
  <div className="animate-fade-in">
    <div
      className="skeleton"
      style={{
        width: "200px",
        margin: "0 auto 20px",
        height: "40px",
        borderRadius: "8px",
      }}
    />
    <div className="stats-grid">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="skeleton skeleton-card"
          style={{ height: "80px" }}
        />
      ))}
    </div>
    <div className="users-grid">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="skeleton skeleton-card" />
      ))}
    </div>
  </div>
);
