---
title : 將Lambda放到VPC中，發生了什麼？
authors : [jinshan]
date : 2026-04-03
tags : [AWS, Lambda, VPC]
---

# Lambda在VPC中卡住的原因-ENI機制深度解析

為什麼把Lambda放進VPC後冷啟動會從毫秒級變成十幾秒？

## 為什麼Lambda函數需要走進VPC？

預設的情況下，Lambda函數運行在AWS託管的網絡空間中，可以存取公網的網際網路端點，但是無法直接存取你VPC內部的私有資源，例如RDS、ElastiCache等。如果你的Lambda函數需要訪問這些私有資源，就必須將它放入VPC中。

一旦你為Lambda設定中指定了VPC、子網與安全群組，AWS就會為這個函數建立Elastic Network Interface，讓它伸出一隻手伸進VPC。而這隻手就是問題的根源。

現在矛盾的點就是，Lambda追求毫秒級的啟動，但是建立ENI是一個VPC層級的控制平面操作，天生就非常慢。

## 舊時代（2019年前）：每次呼叫都會卡ENI

### 原始流程

在2019年9月之前，VPC Lambda冷啟動流程如下：
- 請求建立ENI：Lambda服務向EC2控制平台發出CreateNetworkInterface API請求，要求在指定子網中創建一個ENI。
- 分配私有IP：從你指定的子網CIDR中取得一個可用的私有IP地址。
- 附加安全組：從你指定的Security Group規則套用到這張ENI上。
- Attach 到 Lambda MicroVM：ENI被連接到Firecracker MicroVM的虛擬網卡上。
- 函數啟動：Runtime初始化，載入你的handler，開始處理請求。
  
### Firecracker MicroVM是什麼？
  Firecracker是AWS開源的一套輕量級虛擬機器監控器VMM，專門為serverless場景設計。它用Rust編寫，基於Linux KVM來建立和運行所謂的microVM。

#### 為什麼需要它？

Lambda是多租戶環境，你的函數和其他人的函數跑在同一台實體服務器上。AWS需要在隔離性和啟動速度之間取得平衡：
- 傳統VM（類似QEMU）隔離性強，但啟動要好幾秒，而且模擬了一堆Lambda不需要的硬體--USB、顯示卡、音效卡、PCI
- 容器（類似Docker）啟動快，但容器共享宿主機的kernel，在多租戶環境中安全風險較高。

AWS最早採用傳統VM來跑Lambda，有安全性，但是效能和密度不好，於是開發了Firecra--結合了VM的硬體級隔離和容器的資源效率與快速啟動。

#### Firecracker精簡程度

Firecracker的每個microVM記憶體開銷低於5MiB，啟動時間最快只要125毫秒，單台伺服器每秒可建立最多150個microVM。之所以能這麼快，是因為完全不實作BIOS、PCI等傳統硬體模擬，只透過精簡的virtio介面和guest kernel溝通。

#### 和ENI之間的關係

每次Lambda冷啟動，AWS會啟動一個Firecracker microVM來執行代碼，如果你的Lambda配置了VPC，這個microVM就需要一張ENI來接入你的VPC網路，在舊架構下，每啟動一個microVM就要即時建立一張ENI，這就是冷啟動卡住的原因。

### 架構
```hcl
┌──────────────────────────────────────────────────────────┐
│  你的 VPC ─ Subnet: 10.0.1.0/24 (可用 IP: 251)          │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │  ENI-001 │  │  ENI-002 │  │  ENI-003 │  ...          │
│  │ 10.0.1.5 │  │ 10.0.1.6 │  │ 10.0.1.7 │               │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘               │
│       │              │              │                     │
└───────┼──────────────┼──────────────┼─────────────────────┘
        │              │              │
  ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
  │ Lambda #1 │  │ Lambda #2 │  │ Lambda #3 │
  │ (MicroVM) │  │ (MicroVM) │  │ (MicroVM) │
  └───────────┘  └───────────┘  └───────────┘
```

## 三大問題

### IP地址耗盡

一個/24子網只有251個可用IP，扣掉AWS保留的五個，如果你有多個Lambda函數共用相同的子網，並發量大了之後，ENI佔滿IP後新的呼叫會收到ENIlimitException。

### ENI數量上限

每個Region/Account預設的ENI上限大約在5000左右，當你有多個高併發的VPC Lambda，加上其他EC2實例也在消耗ENI，很容易達到上限。

### 安全組規則變化

有人修改了Lambda使用的SG，加了一條規則，Lambda下次冷啟動才會套用新規則，而已經運行的實例仍使用舊規則--導致行為不一致。

## 新時代：AWS Hyperplan架構

2019年9約，AWS宣佈了VPC Lambda的重大架構--引入Hyperplan ENI（也稱為VPC-to-VPC NAT）。

### 核心變化：ENI在函數建立/更新時預建

新架構下，ENI不再是呼叫時才建立，而是在你Create/Update Function的時候就預先建立好，這些ENI被稱為Hyperplan ENI，它們是共享的--同一個函數的多個併發實例可以共用一張ENI。

```
┌──────────────────────────────────────────────────────────┐
│  你的 VPC ─ Subnet: 10.0.1.0/24                         │
│                                                          │
│  ┌──────────────────────┐                                │
│  │  Hyperplane ENI      │  ← 函數部署時就建好             │
│  │  10.0.1.5            │  ← 多個實例共用                 │
│  └──────────┬───────────┘                                │
│             │                                            │
│    ┌────────┴─────────┐                                  │
│    │  VPC-to-VPC NAT  │  ← AWS Hyperplane 服務           │
│    │  (Mapping Table) │                                  │
│    └────────┬─────────┘                                  │
│             │                                            │
└─────────────┼────────────────────────────────────────────┘
              │
    ┌─────────┼─────────────────────┐
    │         │    Lambda Service    │
    │   ┌─────▼─────┐  ┌───────────┐│
    │   │ Lambda #1 │  │ Lambda #2 ││
    │   │ (MicroVM) │  │ (MicroVM) ││  ... 可能上百個
    │   └───────────┘  └───────────┘│
    └───────────────────────────────┘
```

由於ENI已經存在，冷啟動時不需要走CreateNetworkInterface，Lambda實例通過Hyperplan的NAT mapping就能進入VPC，時間大幅度下降。

## Hyperplan也不是完美的

### 部署時候ENI建立仍然需要時間

當你第一次部署VPC Lambda或更新其子網/安全群組設定時，AWS仍然需要建立Hyperplan ENI。這個過程需要時間，這個期間函數會處於Pending狀態。

### 需要足夠的IAM權限

Lambda執行角色需要EC2網路相關權限，如果你使用自定的IAM policy，確認包含以下權限：

```json
{
  "Effect": "Allow",
  "Action": [
    "ec2:CreateNetworkInterface",
    "ec2:DescribeNetworkInterfaces",
    "ec2:DeleteNetworkInterface",
    "ec2:AssignPrivateIpAddresses",
    "ec2:UnassignPrivateIpAddresses"
  ],
  "Resource": "*"
}
```

最簡單的方式是附加AWS託管策略`AWSLambdaVPCAccessExecutionRole`，它包含了上述權限。

### 子網規劃仍然重要

雖然IP消耗大幅度降低，但是如果你子網仍然很少，加上其他服務也在使用，仍可能出現問題，建議至少使用/24子網。

### 跨AZ的高可用配置

設定Lambda VPC，應選擇至少兩個不同的AZ子網，如果某個AZ出問題，Lambda可以自動使用另一個AZ的ENI，確保可用性。

VPC Lambda要存取公網資源，需要搭配NAT Gateway（放在public subnet）Lambda自己所在的private subnet路由表要將0.0.0.0/0指向NAT Gateway，不然Lambda放進VPC就會出不去了。

## 參考文檔
- [AWS官方文檔](https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html)
- [AWS文檔](https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc-internet.html)