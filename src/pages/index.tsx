import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <div className={styles.awsBadge}>☁️ Amazon Web Services</div>
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro">
            開始閱讀筆記
          </Link>
          <Link
            className={clsx('button button--outline button--secondary button--lg', styles.btnOutline)}
            to="/blog">
            學習日誌
          </Link>
        </div>
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statNum}>200+</span>
            <span className={styles.statLabel}>AWS 服務</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <span className={styles.statNum}>持續</span>
            <span className={styles.statLabel}>更新中</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <span className={styles.statNum}>實戰</span>
            <span className={styles.statLabel}>導向學習</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="記錄 AWS 雲端學習歷程，涵蓋運算、儲存、網路、安全、監控等核心服務筆記">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
