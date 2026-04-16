---
title : Lambda Snapshot機制：冷啟動黑科技
authors : [jinshan]
date : 2026-04-06
tags : [AWS, Lambda, VPC]
---

## Lambda Snapshot機制

### 目前的問題

Lambda冷啟動的延遲主要來自Init階段，下載程式碼、啟動Runtime、執行初始化邏輯。對Node.js/python來說可能只需要幾百毫秒，但是對於java來說，JVM需要啟動，類加載器需要跑、Spring Boot要掃描一堆Bean、反射、DI容器初始化。

一個典型的Spring Boot Lambda，Init Duration會達到5-10秒。用戶第一個請求等待7秒，這在API場景下完全不可以接受。

### Snapstart的核心機制: Firecracker Snapshot/Restore

SnapStart的本質就是一句話：把Init從每次冷啟動做變成發版時候只做一次，之後從快照恢復。

具體流程：
- 當你啟用SnapStart並且發布一個新的函數版本時候，Lambda會觸法快照流程：先運行函數的完整初始化階段。
- 然後對已經初始化的執行環境拍攝一個不可變的、加密的Firecracker microVM快照，包含記憶體和磁碟的完整狀態，再將快照分快緩存以供快速取回。
- 之後冷啟動就不需要再走Init了，Lambda直接從緩存的快照恢復新的執行環境，而不是從頭初始化，用一個更快的resume階段取代了原本最耗時的初始化階段。

### 快照的存儲機制

Lambda將快照存儲在S3中，分割成512KB的Chunk以優化取回延遲。由於S3的取回需要數百毫秒，Lambda使用兩層緩存加速：L2是專門構建的分布式緩存艦隊，每個AZ都有一份獨立副本，Chunk從L2取回的性能通常在個位數毫秒級別。

這意味著恢復一個快照並不是去S3拉一整個大文件，而是按需、分塊、多層緩存地載入。

## CRaC 讓應用層也能配合快照

Firecracker層面的snapshot/restore解決了VM狀態保存和恢復，但應用層也有自己的問題：數據庫連線、打開的socket、隨機數種子、臨時憑證等，這些東西被放進快照之後，恢復出來可能就已經失效了。

這就是CRaC發揮作用的地方。

CRaC在Java應用生命週期引入了新的before-checkpoint和after-restore階段。與非協調式的checkpoint/restore不同，協調式的做法允許被恢復的Java應用根據執行環境的變化做出不同的反應。

它提供兩個核心hook：
- beforeCheckpoint() --快照拍攝前調用，你在這裡關閉數據庫連線、釋放文件句柄、清除臨時狀態
- afterRestore() --快照恢復時候調用，你在這裡重新建立連線、刷新憑證、重新播種隨機數生成器

```java
public class MyHandler implements RequestHandler<Event, Response>, Resource {

    private Connection dbConn;

    public MyHandler() {
        // 這段在 Init 階段執行，會被快照捕獲
        Core.getGlobalContext().register(this);
        dbConn = DriverManager.getConnection(DB_URL);
    }

    @Override
    public void beforeCheckpoint(Context<? extends Resource> context) {
        // 快照前：關閉連線（因為恢復後可能已過期）
        dbConn.close();
    }

    @Override
    public void afterRestore(Context<? extends Resource> context) {
        // 恢復後：重新建立連線
        dbConn = DriverManager.getConnection(DB_URL);
    }
}
```

Spring Boot、Quarkus、Micronaut 等主流框架已經內建了 CRaC 支援，多數情況下開發者不需要手動改程式碼就能使用。

## 類加載時機對快照的影響 - Priming 

在初始化未被執行的代碼路徑--比如透過依賴注入延遲加載的類--不會被包含在快照之中。

這意味著假設你有一個Lambda handler裡用了10個Service類，但只有3個在Init階段被觸及，剩下7個要等到第一次請求進來時才會被JVM類加載器載入。那些7個類的加載器就會落在快照恢復後的第一次請求上。

解法是Priming預熱：在beforeCheckpoint階段主動觸發延遲加載的類

```java
@Override
public void beforeCheckpoint(Context<? extends Resource> context) {
    // 主動觸發類加載和 JIT，讓它們被快照捕獲
    new ObjectMapper().readValue("{\"test\":1}", Map.class);
    // 甚至可以做一次模擬調用
    handleRequest(dummyEvent, dummyContext);
}
```

## 唯一性陷阱

因為SnapStart 用同一份快照作為多個執行環境的初始狀態，所以在初始化階段生成的「唯一」內容被快照捕獲後，恢復到多個實例中就不再唯一了。 Amazon Web Services
典型翻車場景：

- Init 時生成了一個 UUID 作為實例 ID → 所有從同一快照恢復的實例拿到相同的 UUID
- Init 時用 SecureRandom 播了種 → 所有實例的隨機數序列完全一致，在加密場景下是致命漏洞
- Init 時拿了一個 STS 臨時憑證 → 恢復時可能已經過期

解法：所有需要唯一性的內容，必須從 Init 階段移到 handler 中，或者放到 afterRestore() hook 裡生成。

```hcl
發版時（一次性）：
  Code Deploy → Init（JVM 啟動、類加載、DI、連線建立）
       ↓
  CRaC beforeCheckpoint() → 關閉外部資源
       ↓
  Firecracker snapshot → 記憶體 + 磁碟狀態 → 加密 → 分成 512KB chunks
       ↓
  S3（持久層）→ L2 分布式緩存 → L1 Worker 本地緩存

每次冷啟動（毫秒級）：
  請求進來 → 無暖實例可用
       ↓
  從緩存拉取 chunks → 恢復 Firecracker microVM
       ↓
  CRaC afterRestore() → 重建連線、刷新憑證、重新播種
       ↓
  Handler 執行 → 回應請求
```