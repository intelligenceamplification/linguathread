export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <picture className={className} aria-hidden="true">
      <source media="(prefers-color-scheme: dark)" srcSet="/brand/v2/icon-dark-192.png 192w, /brand/v2/icon-dark-512.png 512w" />
      {/* The approved raster artwork uses native picture selection without runtime JS. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/v2/icon-light-192.png" srcSet="/brand/v2/icon-light-192.png 192w, /brand/v2/icon-light-512.png 512w" sizes="(max-width: 600px) 100px, 180px" width="192" height="192" alt="" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "22%" }} />
    </picture>
  );
}

export function BrandLogo({ className = "" }: { className?: string }) {
  return <span className={`brand-logo ${className}`}><BrandMark className="brand-symbol" /><span className="brand-name">LinguaThread</span></span>;
}
