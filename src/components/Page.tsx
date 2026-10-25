import type { ReactNode } from "react";

export function Page({
  children,
  title,
  eyebrow,
  back,
  className = "",
}: {
  children: ReactNode;
  title?: string;
  eyebrow?: string;
  back?: () => void;
  className?: string;
}) {
  return (
    <main className={`page ${className}`}>
      {(eyebrow || title || back) && (
        <header className="page-head">
          {back && (
            <button className="icon-button" onClick={back} aria-label="返回">
              ←
            </button>
          )}
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {title && <h1>{title}</h1>}
          </div>
        </header>
      )}
      {children}
    </main>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  tone = "amber",
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "amber" | "red" | "ghost";
}) {
  return (
    <button className={`primary-button ${tone}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function Reading({
  jp,
  kana,
  zh,
}: {
  jp: string;
  kana?: string;
  zh?: string;
}) {
  return (
    <div className="reading">
      <b>{jp}</b>
      {kana && <span>{kana}</span>}
      {zh && <small>{zh}</small>}
    </div>
  );
}
