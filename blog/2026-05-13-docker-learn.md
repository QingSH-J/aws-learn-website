---
title : Docker鏡像分層與層共享
authors : [jinshan]
date : 2026-05-13
tags : [Docker]
---

## 第一個問題

假設你的伺服器上跑了兩個容器:

```text
container1: Ubuntu(200MB) + Nginx(50MB) = 250MB
container2: Ubuntu(200MB) + MySQL(100MB) = 300MB
```

按照常識來說，磁碟總共應該花了200+200+200+50+100=750MB，但是實際上只有200+50+100=350MB。這是為什麼呢？

因為Ubuntu那200MB的鏡像只存了一份，這就是Docker分層架構要做的事情。

## Docker鏡像的本質：一疊唯讀的層

Docker鏡像不是一個整體的大檔案，而是一層一層疊起來的，每一層對應Dockerfile中的一條指令。

```Dockerfile
FROM ubuntu:22.04 # 這一層包含了ubuntu的檔案
RUN apt-get install -y nginx # 這一層包含了安裝nginx的檔案
RUN apt-get install -y mysql-server # 這一層包含了安裝mysql的檔案
```

每一層只記錄相對上一層的改變

```text
┌─────────────────────┐
│  第3層: config檔案   │  1MB（只有這層的新內容）
├─────────────────────┤
│  第2層: Nginx       │  30MB
├─────────────────────┤
│  第1層: Ubuntu      │  200MB
└─────────────────────┘
```

所有層都是唯讀的，構建完成後不可以修改。

## 三：層共享

當你基於同一個 Ubuntu 構建兩個不同鏡像時：

```text
image1 (nginx):   [Ubuntu 200MB] → [Nginx 50MB]
image2 (mysql):   [Ubuntu 200MB] → [MySQL 100MB]
```

Docker 透過每層的 Content Hash（內容哈希）來識別層是否相同。Ubuntu 層的 hash 完全一致，所以磁碟上只存一份：

```text
磁碟實際儲存：

┌─────────────────────┐
│  MySQL層            │  100MB  ← image2 獨有
├─────────────────────┤
│  Nginx層            │  50MB   ← image1 獨有
├─────────────────────┤
│  Ubuntu層           │  200MB  ← 兩個鏡像共享
└─────────────────────┘

總計：350MB，而不是 750MB
```

## 四：容器執行時

鏡像層是唯讀的，那容器如果在執行的時候寫檔案怎麼辦？

Docker在唯讀鏡像層上面再加了一層可寫的容器層

```text
┌─────────────────────┐
│  容器層（可寫）      │  ← 容器執行時產生的檔案寫在這裡
├─────────────────────┤
│  Nginx層（唯讀）     │
├─────────────────────┤
│  Ubuntu層（唯讀）    │
└─────────────────────┘
```

這就是 Copy-on-Write（寫時複製）機制：

讀檔案：從上往下找，找到就返回  
寫檔案：先把檔案從唯讀層複製到容器層，再修改

所以即使 100 個容器基於同一個鏡像，鏡像層依然只有一份，每個容器只多出自己那個很薄的容器層。

```text
container1  container2  container3
  [寫層1]     [寫層2]     [寫層3]   ← 各自獨立，很小
      ↘          ↓         ↙
       [共享的唯讀鏡像層]            ← 只有一份
```

## 五：這對Dockerfile寫法的啟示

利用層快取：把不常變的指令放前面，常變的指令放後面，這樣修改後只需要重建後面的層，前面的層可以複用。

```Dockerfile
# ✅ 好的寫法
COPY requirements.txt .       # 依賴檔案變化少 → 快取穩定
RUN pip install -r requirements.txt
COPY . .                      # 程式碼經常變 → 放最後

# ❌ 差的寫法
COPY . .                      # 程式碼一變，下面的依賴安裝就要重跑
RUN pip install -r requirements.txt
```

合併RUN減少層數

```Dockerfile
# ❌ 產生3層，中間層的快取檔案仍佔空間
RUN apt-get update
RUN apt-get install -y curl
RUN rm -rf /var/lib/apt/lists/*

# ✅ 一層搞定，最終只保留有用的檔案
RUN apt-get update && \
    apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/*
```
