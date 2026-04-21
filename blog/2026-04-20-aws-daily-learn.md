---
title : 一條奇怪的CNAME記錄
authors : [jinshan]
date : 2026-04-10
tags : [AWS, DNS, CloudFlare]
---

## 一條奇怪的CNAME記錄

在CloudFlare的DNS管理界面上，有一條奇怪的CNAME記錄：

```
Type: CNAME
Name:_222ec04618be45...
Content: _b8c270d13e0adf5a673...
```

另外一條則是由qingshiyuu.com指向cloudfront.net的CNAME記錄。

這條CNAME有什麼用呢？

## CA與SSL證書

當你在瀏覽器地址欄看到qingshiyuu.com那把綠色鎖頭，你其實在信任一個承諾。

這個承諾是：有一個受信任的第三方替這個網站擔保，確認你現在連接的 qingshiyuu.com，確實是 qingshiyuu.com 的主人運營的，不是別人偽裝的。

這個第三方就是CA（Certificate Authority），AWS的ACM（AWS Certificate Manager）就是一個CA。

此時的問題是如果任何人都有資格申請任何域名的證書，我就能申請一張`google.com`的證書，然後冒充google.com來騙取用戶的信任。

所以，在CA頒布證書值錢，必須先問一個問題，你能證明你是這個域名的主人嗎？

驗證的邏輯非常簡單，只有能修改DNS記錄的人才能證明他是域名的主人。

道理很簡單——DNS 記錄只有登錄域名管理後台才能修改，這個後台只有域名的購買者才有訪問權限。所以如果你能在 DNS 裡加一條特定的記錄，就等於你在向全世界說：我能控制這個域名，這個後台在我手上。

ACM 用的就是這個邏輯：它給你一個只有它自己知道的隨機字符串，讓你把它加進 DNS。它去查，查到了，就知道你是域名的主人，然後才頒發證書。

這條記錄，就是在 Cloudflare 後台看到的那條奇怪的 CNAME。

## 申請的四個階段

### 階段一：申請證書

ACM生成一對全局唯一的隨機字符串，告訴我把其中一個字符串（_222ec04618be45...）加到DNS裡，然後它會去查這個記錄的值。

### 階段二：DNS驗證

我把這個字符串加到DNS裡，ACM去查這個記錄的值，查到了，就知道我能控制這個域名，然後才頒發證書。

### 階段三：ACM掃描

DNS查詢那條字符串。

返回的值和ACM生成的值一樣。

驗證通過，證書狀態從Pending變為Issued。

### 階段四：證書頒發。

可以在cloudfront中使用證書了。

## 總結

這整個過程展示了如何通過DNS記錄來驗證域名所有權，並最終獲得SSL證書。這不僅保護了用戶的數據安全，也增強了網站的可信度。

