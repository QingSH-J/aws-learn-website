import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

type ServiceCard = {
  title: string;
  emoji: string;
  description: string;
  link: string;
};

const ServiceList: ServiceCard[] = [
  {
    title: '運算服務',
    emoji: '⚡',
    description: 'EC2、Lambda、ECS、EKS — 從虛擬機到無伺服器，掌握各種運算資源的部署與管理。',
    link: '/docs/intro',
  },
  {
    title: '儲存與資料庫',
    emoji: '🗄️',
    description: 'S3、RDS、DynamoDB、ElastiCache — 學習如何選擇和使用合適的存儲方案。',
    link: '/docs/intro',
  },
  {
    title: '網路與安全',
    emoji: '🔒',
    description: 'VPC、IAM、CloudFront、WAF — 建立安全可靠的雲端網路架構與存取控制。',
    link: '/docs/intro',
  },
  {
    title: '監控與維運',
    emoji: '📊',
    description: 'CloudWatch、CloudTrail、X-Ray — 掌握系統觀測、日誌分析與效能調優。',
    link: '/docs/intro',
  },
  {
    title: '開發者工具',
    emoji: '🛠️',
    description: 'CodePipeline、CodeBuild、CDK、SAM — 建立現代化 CI/CD 流程與基礎設施即程式碼。',
    link: '/docs/intro',
  },
  {
    title: '認證備考',
    emoji: '🏆',
    description: 'SAA-C03、DVA-C02 等認證的重點整理、練習題與考試心得分享。',
    link: '/docs/intro',
  },
];

function ServiceCardItem({title, emoji, description, link}: ServiceCard) {
  return (
    <div className={clsx('col col--4', styles.cardCol)}>
      <Link to={link} className={styles.cardLink}>
        <div className={styles.card}>
          <div className={styles.cardEmoji}>{emoji}</div>
          <Heading as="h3" className={styles.cardTitle}>{title}</Heading>
          <p className={styles.cardDesc}>{description}</p>
        </div>
      </Link>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>學習主題</Heading>
        <div className="row">
          {ServiceList.map((props, idx) => (
            <ServiceCardItem key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
