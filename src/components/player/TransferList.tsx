import ClubBadge from "./ClubBadge";
import { club, clubLogos, type Transfer } from "../../lib/data";
import { fmtValue } from "../../lib/format";
import { cx } from "../../lib/cx";
import { t, tr, trTransfer, type Lang } from "../../i18n";
import "../../styles/components/transfer-list.css";

const kindClass = (type: string | null) =>
  !type ? "" : type.startsWith("租借回归") ? "k-return" : type.startsWith("租借") ? "k-loan" : type.startsWith("免签") ? "k-free" : "k-fee";

export default function TransferList({ lang, items }: { lang: Lang; items: Transfer[] }) {
  const name = (c: string | null) => (c ? tr(lang, "clubs", c) : "?");
  const logo = (c: string | null, l?: string | null) => l ?? (c ? clubLogos[c] : null);
  return (
    <ol className="tl">
      {items.map((tf, i) => (
        <li key={`${tf.date}-${i}`} className={cx({ us: tf.to === club.name_zh || tf.from === club.name_zh }) || undefined}>
          <time className="tl-date">{tf.date}</time>
          <div className="tl-move">
            <span className="tl-club"><ClubBadge logo={logo(tf.from, tf.from_logo)} name={name(tf.from)} /><span className="tl-name">{name(tf.from)}</span></span>
            <svg className="tl-arrow" viewBox="0 0 24 24" aria-label="→"><path d="M4 12h15m-5-6 6 6-6 6" /></svg>
            <span className="tl-club"><ClubBadge logo={logo(tf.to, tf.to_logo)} name={name(tf.to)} /><span className="tl-name">{name(tf.to)}</span></span>
          </div>
          <div className="tl-meta">
            {tf.type && <span className={cx("tl-kind", kindClass(tf.type))}>{trTransfer(lang, tf.type)}</span>}
            {tf.fee_eur ? <span className="tl-fee" title={t(lang, "player.fee")}>{fmtValue(tf.fee_eur)}</span> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
