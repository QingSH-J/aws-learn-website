---
title : 設計Redis鎖的思路
authors : [jinshan]
date : 2026-04-13
tags : [Redis]
---

## Redis鎖

當Redis被用來做分布式鎖、限流、去重的時候，key應該如何設計？

## 建立模型

在建立鎖之前，先根據我們要解決的問題想一下以下幾個點：
- 什麼東西會被加鎖？
- 在做什麼的時候需要加鎖？
- 在什麼時間窗口內需要加鎖？
- 在什麼環境下鎖生效？

可以把key想像為一個業務範圍的名字。

例如: rate_limit:prod:payment:user:12345:create_order:2026-04-13T12:00

這串key的意思是在 prod 環境，payment 業務裡，user 123 在 2026-04-13 12:00 這一分鐘內 create_order 的次數。

在比如說: lock:prod:order_id:0519:pay

表示在prod環境裡，對 order_id 0519 的 pay 操作加鎖。

所以 key 設計的本質是：把抽象的控制範圍變成一個穩定、唯一、可過期、可觀察的名字。

## 一個好的key

應該設計有如下結構的鎖：

```text
{purpose}:{env}:{domain}:{scope_type}:{scope_id}:{action}:{window / version}
```

`purpose:` lock / rate_limit / deduplication 表示key做什麼？

`env`: prod / staging / dev 表示在哪個環境？

`domain`: payment / user / inventory 表示業務範圍？

`scope_type`: user_id / order_id / ip 表示鎖的範圍類型？

`scope_id`: 12345 / 0519 

`action`: create_order / pay 表示鎖的具體行為？

`window / version`: 2026-04-13T12:00 / v1 表示鎖的時間窗口或者版本？

```eg
rate_limit:prod:auth:user:123:login:202604211035
rate_limit:prod:auth:ip:1.2.3.4:login:202604211035
lock:prod:payment:order:98765:capture
dedupe:prod:notification:user:123:send_email:template_abc
```

## 一些設計

### 鎖的粒度

lock:prod:order:pay

表示所有訂單使用一把鎖，會導致大量的業務邏輯阻塞。

lock:prod:order:0519:pay:request_id:abc

每個請求都有不同的`request_id`，那就失去了鎖的意義，因為每次都會拿到不同的鎖。

鎖的粒度應該有如下的考慮：

哪些請求同時執行，會互相破環狀態？

### Redis鎖

Redis做鎖的時候，常見的命令是

```text
SET key value NX PX
```

其中：
- `key` 是鎖的名字，根據上面的設計原則來定義。
- `value` 是鎖的持有者，可以是請求ID、主機ID等唯一標識，方便後續的解鎖和觀察。
- `NX` 表示只有當鍵不存在時才會設置成功，適合用於鎖的場景。
- `PX` 表示設置鍵的過期時間，適合用於自動解鎖。

刪除的時候
```del
DEL key
```

這樣會出現問題，因為會發生：
- A請求獲取鎖成功，設置過期時間為10秒。
- A請求處理業務邏輯，可能需要5秒。
- A請求完成業務邏輯，準備釋放鎖，
- 此時鎖已經過期了，A請求刪除的其實是別人的鎖，導致其他請求的鎖被誤刪。

正確的做法應該是`compare token and delete`，確保只有鎖的持有者才能釋放鎖。

### DynamoDB鎖

DynamoDB做鎖的時候，通常一個lock key就是一條item。

```
PK = LOCK#prod#order#order_id#123#pay
```

```
{
  "PK": "LOCK#prod#order#order#98765#pay",
  "owner_token": "uuid",
  "lease_until": 1776748500,
  "created_at": 1776748470,
  "fencing_token": 1024
}
```

獲取鎖的時候用：
```
attribute_not_exists(PK) OR lease_until < :now
```

如果item不存在，可以拿鎖。

如果item存在但是過期了，也可以拿鎖。

### 比較

Redis 很適合：

- 秒級 / 分鐘級限流。
- 短租約分布式鎖。
- 高頻快速計數。
- 需要低延遲的控制面。

Redis key 設計時特別注意：

- key 數量會不會爆炸。
- 每個 key 是否都有合理 TTL。
- 熱 key 是否會集中在少數幾個 key 上。
- Redis Cluster 中多 key Lua 操作是否落在同一 hash slot。


## Redis實戰

### 第一步

在本地docker中開啟一個Redis容器

![image.png](/img/redis-docker.png)

### 第二步

開啟兩個終端，在終端中分別輸入

```docker
docker exec -it redis-1 redis-cli
```
### 第三步

在第一個終端中輸入

```redis
SET lock:prod:order:order_id:0001:pay owner-A NX PX 10000
```

返回OK，表示鎖獲取成功。

同時在第二個終端中輸入

```redis
SET lock:prod:order:order_id:0001:pay owner-B NX PX 10000
```

返回(nil)，表示鎖已經被A持有，B獲取鎖失敗。 


![redis](/img/redis-set-lock.png)

十秒後，鎖過期了，B再次嘗試獲取鎖：

```redis
SET lock:prod:order:order_id:0001:pay owner-B NX PX 10000
``` 

返回OK，表示B獲取鎖成功。

### 錯誤的刪除鎖的方式

如果B現在持有鎖，A嘗試刪除鎖：

```redis
DEL lock:prod:order:order_id:0001:pay
```

這樣會導致B的鎖被誤刪，A應該先檢查鎖的持有者是否是自己：

```redis
EVAL "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end" 1 lock:demo:payment:order:1001:pay owner-A

```

    