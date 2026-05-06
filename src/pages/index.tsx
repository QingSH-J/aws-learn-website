import type { ReactNode } from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import { COLOPHON, TOPICS, RECENT, EXAMS } from '../data/site';
import styles from './index.module.css';

function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="qsy-eyebrow">{children}</div>;
}

function Hero() {
  return (
    <section className="qsy-hero">
      <div>
        <Eyebrow>Field notes · Vol. 02</Eyebrow>
        <h1 className="qsy-h1">
          邊學雲端與 AI，<br />
          <em>邊把它寫下來。</em>
        </h1>
        <p className="qsy-lead">
          這是我的學習筆記。記錄 AWS 雲端服務的實作心得，也記錄 AI 應用開發——RAG、Agent、Bedrock——踩過的坑與值得深想的問題。
        </p>
        <div>
          <Link className="qsy-cta" to="/docs/intro">
            開始讀筆記 <span className="qsy-arrow">→</span>
          </Link>
          <Link className="qsy-cta-secondary" to="/blog">
            看最近的學習日誌
          </Link>
        </div>
      </div>

      <aside className="qsy-colophon">
        <div className="qsy-colophon-label">Colophon</div>
        <dl>
          {COLOPHON.map(([k, v, mono]) => (
            <div className="qsy-colophon-row" key={k as string}>
              <dt>{k}</dt>
              <dd className={mono ? 'mono' : ''}>{v}</dd>
            </div>
          ))}
        </dl>
      </aside>
    </section>
  );
}

function RecentLog() {
  const [featured, ...rest] = RECENT;
  return (
    <section className="qsy-section">
      <div className="qsy-section-head">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
          <h2 className="qsy-section-title">學習日誌</h2>
          <span className={styles.metaCount}>{RECENT.length} of {RECENT.length + 26}</span>
        </div>
        <Link to="/blog" className={styles.allLink}>
          全部 <span className="qsy-arrow">→</span>
        </Link>
      </div>

      <div className={styles.recentGrid}>
        <article className={styles.featured}>
          <div className={styles.postMeta}>
            <span className={styles.postTag}>{featured.tag}</span>
            <span className={styles.metaDot}>·</span>
            <span>{featured.date}</span>
            <span className={styles.metaDot}>·</span>
            <span>{featured.readTime}</span>
          </div>
          <h3 className={styles.featuredTitle}>{featured.title}</h3>
          <p className={styles.featuredExcerpt}>{featured.excerpt}</p>
          <Link to={`/blog/${featured.slug}`} className={styles.continueLink}>
            繼續閱讀 <span className="qsy-arrow">→</span>
          </Link>
        </article>

        <div className={styles.recentList}>
          {rest.slice(0, 5).map((p) => (
            <article key={p.slug} className={styles.recentItem}>
              <div className={styles.postMeta}>
                <span>{p.date}</span>
                <span className={styles.metaDot}>·</span>
                <span className={styles.tagAccent}>{p.tag}</span>
              </div>
              <h4 className={styles.recentTitle}>
                <Link to={`/blog/${p.slug}`}>{p.title}</Link>
              </h4>
              <p className={styles.recentExcerpt}>{p.excerpt}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Topics() {
  return (
    <section className="qsy-toc">
      <div>
        <div className="qsy-colophon-label">Table of contents</div>
        <h2 className={styles.tocBigTitle}>學習主題</h2>
        <p className={styles.tocIntro}>
          筆記按技術領域分類，涵蓋 AWS 雲端服務與 AI 應用開發。每個主題持續補充新內容與實作範例。
        </p>
      </div>
      <div>
        {TOPICS.map((t) => (
          <Link to="/docs/intro" className="qsy-toc-row" key={t.idx}>
            <span className="qsy-toc-idx">{t.idx}</span>
            <div>
              <div>
                <span className="qsy-toc-name">{t.title}</span>
                <span className="qsy-toc-en">{t.en}</span>
              </div>
              <p className="qsy-toc-desc">{t.desc}</p>
            </div>
            <div className={styles.tagRow}>
              {t.services.map((s) => (
                <span key={s} className="qsy-tag">{s}</span>
              ))}
            </div>
            <span className="qsy-toc-arrow">→</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ExamProgress() {
  return (
    <section className="qsy-section">
      <div className={styles.examGrid}>
        <div>
          <Eyebrow>認證進度</Eyebrow>
          <h2 className={styles.examTitle}>
            考試,<br />
            <em>誠實地記錄。</em>
          </h2>
          <p className={styles.examIntro}>
            不是炫耀，而是自我約束。每張證照背後都是幾百小時的閱讀、實作、反覆做題。
          </p>
        </div>
        <div className={styles.examTable}>
          {EXAMS.map((e) => (
            <div key={e.code} className={styles.examRow}>
              <span className={styles.examCode}>{e.code}</span>
              <span className={styles.examName}>{e.name}</span>
              <span className={styles.examStatus} data-status={e.status}>{e.status}</span>
              <span className={styles.examDate}>{e.date}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout
      title="Qingshiyuu"
      description="記錄學習雲端與 AI 的歷程：AWS 服務實戰、RAG 系統設計、Agent 開發"
    >
      <main className="qsy-home">
        <Hero />
        <RecentLog />
        <Topics />
        <ExamProgress />
      </main>
    </Layout>
  );
}
