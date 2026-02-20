import { useEffect, useRef, useState } from "react";

type Props = {
  src?: string;
  alt?: string;
  className?: string;
};

export default function SmartImg({ src, alt = "", className }: Props) {
  const ref = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // reset ทุกครั้งที่ src เปลี่ยน
  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  // กันเคสรูปโหลดจาก cache แล้ว onLoad ไม่ทัน
  useEffect(() => {
    const t = setTimeout(() => {
      const img = ref.current;
      if (img && img.complete && img.naturalWidth > 0) setLoaded(true);
    }, 0);
    return () => clearTimeout(t);
  }, [src]);

  if (!src) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border bg-gray-50 text-sm text-gray-500">
        ไม่มีรูป
      </div>
    );
  }

  return (
    <div className="relative h-48 overflow-hidden rounded-2xl border bg-gray-50">
      {!loaded && !failed && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
          กำลังโหลดรูป...
        </div>
      )}

      {failed && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-red-500">
          โหลดรูปไม่สำเร็จ
        </div>
      )}

      <img
        ref={ref}
        src={src}
        alt={alt}
        className={`h-full w-full object-cover ${
          loaded ? "opacity-100" : "opacity-0"
        } ${className || ""}`}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        loading="lazy"
      />
    </div>
  );
}