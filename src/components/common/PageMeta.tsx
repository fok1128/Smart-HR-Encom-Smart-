import { useEffect } from "react";

type PageMetaProps = {
  title?: string;
  description?: string;
};

export default function PageMeta({ title, description }: PageMetaProps) {
  useEffect(() => {
    if (title) document.title = title;

    const meta =
      document.querySelector('meta[name="description"]') ||
      document.createElement("meta");

    meta.setAttribute("name", "description");
    meta.setAttribute("content", description ?? "");
    if (!meta.parentNode) document.head.appendChild(meta);
  }, [title, description]);

  return null;
}

export function AppWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
