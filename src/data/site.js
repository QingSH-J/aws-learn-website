// src/data/site.js — single source of truth for the home page
// RECENT entries are derived from real blog/ frontmatter

export const COLOPHON = [
  ['作者', 'Qing', false],
  ['開始於', '2025 年 11 月', true],
  ['更新', '13 天前', true],
  ['正在讀', 'Designing Data-Intensive Applications', false],
  ['備考', 'DVA-C02 · 2026 年 6 月', true],
];

export const TOPICS = [
  { idx: '01', title: '運算服務', en: 'Compute', services: ['EC2', 'Lambda', 'ECS', 'EKS'], desc: '從虛擬機到無伺服器，掌握各種運算資源的部署與管理。' },
  { idx: '02', title: '儲存與資料庫', en: 'Storage & Database', services: ['S3', 'RDS', 'DynamoDB', 'ElastiCache'], desc: '學習如何選擇和使用合適的存儲方案，從物件儲存到鍵值資料庫。' },
  { idx: '03', title: '網路與安全', en: 'Network & Security', services: ['VPC', 'IAM', 'CloudFront', 'WAF'], desc: '建立安全可靠的雲端網路架構與存取控制。' },
  { idx: '04', title: '監控與維運', en: 'Observability', services: ['CloudWatch', 'CloudTrail', 'X-Ray'], desc: '掌握系統觀測、日誌分析與效能調優。' },
  { idx: '05', title: '開發者工具', en: 'Developer Tools', services: ['CodePipeline', 'CodeBuild', 'CDK', 'SAM'], desc: '建立現代化 CI/CD 流程與基礎設施即程式碼。' },
  { idx: '06', title: '認證備考', en: 'Certifications', services: ['SAA-C03', 'DVA-C02', 'AIF-C01'], desc: 'AWS 與 AI 認證的重點整理、練習題與考試心得分享。' },
  { idx: '07', title: 'AI 應用', en: 'Applied AI', services: ['Bedrock', 'RAG', 'Agent', 'Claude'], desc: '記錄 AI 應用的實作筆記：RAG 系統設計、Agent 架構、Bedrock 服務實戰。' },
];

// Derived from real blog/ frontmatter, sorted by date descending
export const RECENT = [
  {
    date: '2026-04-23',
    title: 'Dockerfile 怎麼寫？',
    excerpt: '從零開始寫一個 Dockerfile，理解每一行指令的作用與最佳實踐。',
    tag: 'Docker',
    readTime: '8 分鐘',
    slug: '2026/04/23/daily-learn',
  },
  {
    date: '2026-04-20',
    title: '一條奇怪的 CNAME 記錄',
    excerpt: '在 CloudFlare 的 DNS 管理界面上，有一條奇怪的 CNAME 記錄——它到底有什麼用？',
    tag: 'DNS',
    readTime: '6 分鐘',
    slug: '2026/04/20/aws-daily-learn',
  },
  {
    date: '2026-04-13',
    title: '設計 Redis 鎖的思路',
    excerpt: '當 Redis 被用來做分布式鎖、限流、去重的時候，key 應該如何設計？',
    tag: 'Redis',
    readTime: '10 分鐘',
    slug: '2026/04/13/redis-learn',
  },
  {
    date: '2025-04-11',
    title: '什麼是 BGP？',
    excerpt: 'BGP 是互聯網的路由大腦，負責告訴全球所有路由器某個 IP 在哪裡、怎麼去。',
    tag: 'AWS',
    readTime: '9 分鐘',
    slug: '2025/04/11/aws-daily-learn',
  },
  {
    date: '2026-04-07',
    title: '為什麼我的網站刷新後會出現 403 錯誤？',
    excerpt: '原來是 CloudFront + S3 靜態網站的路由配置問題，和 React Router 的 SPA 模式有關。',
    tag: 'AWS',
    readTime: '7 分鐘',
    slug: '2026/04/07/aws-daily-learn',
  },
  {
    date: '2026-04-06',
    title: 'Lambda Snapshot 機制：冷啟動黑科技',
    excerpt: 'SnapStart 把 Init 從每次冷啟動做，變成發版時只做一次——對 Java Lambda 來說是救星。',
    tag: 'Lambda',
    readTime: '12 分鐘',
    slug: '2026/04/06/aws-daily-learn',
  },
];

export const EXAMS = [
  { code: 'CLF-C02', name: 'Cloud Practitioner', status: '已通過', date: '2026-01' },
  { code: 'SAA-C03', name: 'Solutions Architect Associate', status: '已通過', date: '2026-04' },
  { code: 'DVA-C02', name: 'Developer Associate', status: '備考中', date: '2026-06' },
  { code: 'SOA-C02', name: 'SysOps Administrator', status: '計劃中', date: '—' },
  { code: 'AIF-C01', name: 'AI Practitioner', status: '計劃中', date: '—' },
];
