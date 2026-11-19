/**
 * Floating card overlay built on <dialog>. Open it with any element carrying data-modal-open="<id>".
 * Esc, the X button and a click on the backdrop close it.
 */
import type { ReactNode } from "react";
import { t, type Lang } from "../i18n";
import ModalClient from "../client/ModalClient";
import "../styles/components/modal.css";

interface Props { id: string; title: string; lang: Lang; subtitle?: string; children: ReactNode }

export default function Modal({ id, title, lang, subtitle, children }: Props) {
  return (
    <dialog id={id} className="modal" aria-labelledby={`${id}-title`}>
      <div className="modal-card">
        <header className="modal-head">
          <div>
            <h2 id={`${id}-title`}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="modal-x" data-modal-close aria-label={t(lang, "player.close")}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
      <ModalClient />
    </dialog>
  );
}
