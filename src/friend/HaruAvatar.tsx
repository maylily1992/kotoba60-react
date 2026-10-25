export function HaruAvatar({ size = "large" }: { size?: "small" | "large" }) {
  return (
    <div className={`haru-avatar ${size}`} aria-label="原创动漫少年ハル">
      <div className="haru-hair back" />
      <div className="haru-face">
        <span className="haru-eye left" />
        <span className="haru-eye right" />
        <span className="haru-cheek left" />
        <span className="haru-cheek right" />
        <span className="haru-mouth" />
      </div>
      <div className="haru-hair fringe" />
      <div className="haru-hoodie"><i /></div>
    </div>
  );
}
