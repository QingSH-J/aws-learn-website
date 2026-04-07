# Three Tier Architecture with AWS ECS

在日常生活中的應用程式，例如電子商務應用，天然擁有三個層級
- 接受流量的入口層
- 處理邏輯的計算層
- 存儲數據的持久化層

這三者的擴容和維護都不同，安全邊界不同（只有入口層對互聯網暴露），其生命週期也不一樣（持久化層的數據庫很少需要重建，而應用程式的代碼可能需要頻繁部署）。因此，將三個層級分開是非常有必要的。
  
而 AWS 提供了多種服務來實現這些層級的架構，以下是如何使用 AWS ECS（Elastic Container Service）來構建三層架構的示例：

![Three Tier Architecture Diagram](/img/three-tier-diagram.png)

這是一個可以讓容器化應用程式部署在aws上的三層架構，具備部分生產環境的特徵：多可用區高可用，網絡層嚴格隔離，HTTPS加密，自動擴縮容，基礎設施使用代碼管理。

在本架構中，三層架構的主要作用如下：
- 入口層：接收用戶HTTPS請求，做TLS卸載和流量分發。流量高峰時不需要變化
- 計算層：運行邏輯業務的容器，流量高峰的時候需要橫向拓展，低谷時縮回以節約成本
- 持久化層：運行數據庫，數據庫的生命週期和應用程式的生命週期不同，通常不需要頻繁重建，需要最高級別安全保護

整個架構部署在us-east-1區域的兩個可用區內，每個az有三個子網，公有子網放ALB和NAT Gateway，私有子網放ECS容器，私有數據子網放RDS數據庫和Redis數據庫。

## 選型以及Trade-off：
ECS Farget Vs EKS：
選擇Farget是因為目前的應用程式規模不大，而且只有一個應用程式在上面運行，不需要k8s的複雜性和靈活性，Farget的無服務器特性可以簡化運帷。如果未來要運行多個應用程式或者涉及到更精細的資源管理，會考慮遷移到EKS。

Cloudflare VS Route 53:
筆者在CloudFlare上註冊了域名，而Cloudflare Register不支持把nameserver改到第三方，所以使用ACM證書驗證，方法是手動在CloudFlare面板添加CNAME記錄。

tfvars VS Secrets Manager：
開發階段使用tfvars文件存儲敏感信息，生產環境使用Secrets Manager，這樣可以在開發過程中更方便地管理配置，而在生產環境中則能提供更高的安全性。只需要在ECS task definition中添加指向Secrets Manager的ARN即可。

## 項目結構
```python
retail-store-infra/
├── main.tf                 # 調用各Module，定義資源依賴
├── variables.tf            # 項目級別變量
├── outputs.tf              # ALB DNS、RDS endpoint 等
├── providers.tf            # AWS provider + 版本約束
├── backend.tf              # S3 遠程狀態 + DynamoDB 鎖
├── terraform.tfvars        # 環境變量值（不提交到 Git）
│
├── modules/
│   ├── vpc/                # VPC、6 個子網、IGW、NAT GW、路由表
│   ├── alb/                # ALB、Listener、Target Group、ACM 證書
│   ├── ecs/                # ECS 集群、Service、Task Definition、IAM
│   ├── rds/                # RDS 實例、子網組、參數組
│   └── redis/              # ElastiCache 複製組、子網組
│
├── bootstrap/              # S3 + DynamoDB（Terraform 狀態管理）
└── README.md
```
![Project diagram](/img/project-structure.png)

本項目模塊拆分的邏輯是按照生命週期以及所有權進行劃分的，VPC和子網一起創建，一起銷毀，所以放在同一個模塊，ALB的listener可能會頻繁變化而VPC不變，所以兩者分開。安全組跟著各自的組件走，而不是集中在一個文件夾中。

### 模塊之間的數據流
各模塊通過outputs導出數據，根目錄的main.tf集中調用
```hcl
module "ecs"{
    source = "./modules/ecs"
    aws_region = var.aws_region
    project = var.project
    private_subnet_ids = module.vpc.private_app_subnet_ids
    alb_target_group_arn = module.alb.alb_target_group_arn
    app_port = var.app_port
    vpc_id = module.vpc.vpc_id
    alb_sg_id = module.alb.alb_sg_id
    redis_sg_id = module.redis.redis_sg_id
    rds_sg_id = module.rds.db_sg_id
    repo_url = module.ecr.repo_url
    db_endpoint = module.rds.db_endpoint
    redis_endpoint = module.redis.redis_endpoint
    db_password = var.db_password
}
```

## 關鍵設計決策：
### 網絡隔離
每個AZ有三個子網，公有子網放置ALB和NAT Gateway，應用子網放置ECS容器，數據子網放置RDS和Redis。這樣可以確保只有ALB對互聯網暴露，應用層和數據層完全隔離，提高安全性。
子網使用cidrsubnet函數從VPC的CIDR塊中劃分出不同的子網，確保地址空間合理利用。
```hcl
#Public Subnets
resource "aws_subnet" "public" {
    count = 2
    vpc_id = aws_vpc.main.id
    cidr_block = cidrsubnet(var.vpc_cidr, 8, count.index)
    availability_zone = var.azs[count.index]

    map_public_ip_on_launch = true
    tags = {
        Name = "public-${var.azs[count.index]}"
    }
}
```

### 安全組設計
最小權限鏈路設計：
三個安全組形成一條鏈，每一層只允許來自上一層的特定流量
![SG Design](/img/sg-design.png)
安全組之間的引用使用referenced_security_group_id而不是cidr，這意味著即使IP發生改變，規則仍然有效，因為它認證特定安全組的流量。

安全組採用新的aws_vpc_security_group_ingress_rule和aws_vpc_security_group_egress_rule資源來定義規則，而不是在aws_security_group中內聯定義，這樣可以更清晰地管理規則，並且支持更多的功能，例如描述和依賴關係。
```hcl title="aws docs"
resource "aws_security_group" "allow_tls" {
  name        = "allow_tls"
  description = "Allow TLS inbound traffic and all outbound traffic"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "allow_tls"
  }
}

resource "aws_vpc_security_group_ingress_rule" "allow_tls_ipv4" {
  security_group_id = aws_security_group.allow_tls.id
  cidr_ipv4         = aws_vpc.main.cidr_block
  from_port         = 443
  ip_protocol       = "tcp"
  to_port           = 443
}

resource "aws_vpc_security_group_ingress_rule" "allow_tls_ipv6" {
  security_group_id = aws_security_group.allow_tls.id
  cidr_ipv6         = aws_vpc.main.ipv6_cidr_block
  from_port         = 443
  ip_protocol       = "tcp"
  to_port           = 443
}

resource "aws_vpc_security_group_egress_rule" "allow_all_traffic_ipv4" {
  security_group_id = aws_security_group.allow_tls.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1" # semantically equivalent to all ports
}

resource "aws_vpc_security_group_egress_rule" "allow_all_traffic_ipv6" {
  security_group_id = aws_security_group.allow_tls.id
  cidr_ipv6         = "::/0"
  ip_protocol       = "-1" # semantically equivalent to all ports
}
```
[參考文檔](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group)

### ALB
ALB涉及到四個AWS資源：
- aws_lb: ALB在什麼地方
- aws_lb_listener: ALB聽什麼端口，使用什麼協議，收到請求後怎麼處理
- aws_lb_target_group: ALB把流量發送到哪裡，那裡有什麼東西
- aws_ecs_service.load_balancer: 把task註冊到target group裡，讓ALB能找到它
  
80端口的listener只是做重定向，真正處理流量的是443端口的listener，這樣可以確保所有流量都經過TLS加密。

HTTPS實現的全過程：
- Terraform創建ACM證書資源
- ACM生成一條CNAME記錄驗證記錄
- 手動在CloudFlare添加CNAME記錄，完成域名所有權驗證
- 創建ALB HTTPS listener，引用已經驗證的證書

如果域名在Route 53註冊，則可以實現自動化完成

### 成本分析
NAT Gateway是成本最高的資源，光是存在就要2.16$/天，省錢策略是開發階段使用terraform destroy銷毀資源，生產環境使用terraform apply創建資源，這樣可以在不需要的時候節約成本。

### 改進方向
- CI/CD：用CodePipeline + CodeBuild 實現代碼提交後自動部署
- Secrets Manager：把敏感信息從tfvars遷移到Secrets Manager，並在ECS task definition中引用
- 監控警告： 使用CloudWatch監控ECS和RDS的性能指標，設置警告通知
- WAF：在ALB前面添加AWS WAF，保護應用免受常見的網絡攻擊
- 完整微服務部署： 不僅部署一個應用程式，還可以部署多個微服務
- 基礎設施測試： 使用Terratest或類似工具對基礎設施進行自動化測試，確保部署的可靠性和穩定性

### 總結
筆者認為寫terraform代碼的過程中，最大的挑戰是理解AWS資源之間的依賴關係，每一個Association和Attachment都代表一個依賴關係，以及outputs和variables傳遞數據的方式。

### 資料
[項目地址](https://github.com/QingSH-J/aws-ecs-architecture)

[AWS官方文檔](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)