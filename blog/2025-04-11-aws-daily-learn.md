---
title : 什么是BGP
authors : [jinshan]
date : 2026-04-11
tags : [AWS, BGP]
---

## 什么是BGP？

BGP(Border Gateway Protocol)是互聯網的路由大腦，負責告訴全球所有的路由器某個IP地址在哪裡，怎麼去。

當你在瀏覽器輸入google.com，你的ISP路由器查詢BGP路由表，找到去往google.com的最佳路徑，封包才能跨越數十甚至數百個自治系統(AS)到達Google的服務器。

**BGP是唯一在互聯網規模下工作的協議**，管理全球九十萬以上的路由前綴

## AS自治系統

AS(Autonomous System)是BGP的基本單位，代表一個由單一機構管理的網路。

每個AS都有一個唯一的編號ASN，例如Google是ASN15196，AWS是ASN16509。 AS之間通過eBGP建立Peering，互相交換我能連結到哪些IP地址的路由資訊。

## BGP路由機制

BGP的路由通知被叫做Update消息，每當有一個AS有新路由或者路由失效，就發送Update給所有的BGP鄰居。

**關鍵機制**：AS_PATH，每當一個AS宣告一個路由，它會把自己的ASN添加到AS_PATH中。這樣其他AS就知道這條路由經過了哪些AS，避免路由循環。

AS_PATH Prepend 就是利用這個機制：把自己的 ASN 重複追加幾次，讓路徑看起來更長，其他 AS 就會優先選更短的路徑（即 DX）

## BGP路徑屬性

BGP 路徑屬性決定了當有多條路徑到達同一目的地時，路由器選哪條。理解這四個屬性是掌握混合雲路由控制的關鍵：
- LOCAL_PREF：只在同一 AS 內有效。值越高，優先級越高。用來控制「本 AS 的流量從哪個出口出去」。
- AS_PATH：路徑所經過的 AS 序列。越短越優先。跨 AS 可見，是影響對端選路的主要手段。
- Community：可自定義的標籤。AWS 預定義了一些 Community 值，可以讓你告訴 AWS「這條路由請低優先/不要傳播」。

## 決策過程

當路由器收到多條去往同一目的地的路由時，按照嚴格的優先級順序逐條比較，找到第一個能分出勝負的屬性就停止。

生產中最常用的兩個手段：LOCAL_PREF 控制本端選路（出方向），AS_PATH Prepend 影響對端選路（入方向）。

## iBGP和eBGP

eBGP（external BGP）：不同 AS 之間的 BGP 會話。會自動把自己的 ASN 追加到 AS_PATH，修改 NEXT_HOP 為自己的地址，LOCAL_PREF 不會傳遞給對方。

iBGP（internal BGP）：同一 AS 內部的 BGP 會話。不修改 AS_PATH，LOCAL_PREF 可以傳遞。但有個重要限制：iBGP 收到的路由不能再傳給其他 iBGP 鄰居（防環路），所以 AS 內部要麼全互聯，要麼用 Route Reflector 解決。

## BGP在AWS中的應用

在 AWS 混合雲場景中，BGP 扮演三個角色：
- 路由自動發現：機房路由器把機房網段（如 192.168.0.0/16）通過 BGP 告訴 AWS VGW，VGW 自動把這條路由注入 VPC Route Table，無需手動配置靜態路由。
- 故障自動切換：DX 斷開時，BGP 會話超時，VGW 刪除從 DX 學到的路由，自動轉為使用從 VPN 學到的備份路由。
- 路由策略控制：通過 LOCAL_PREF 和 AS_PATH Prepend 控制哪條路徑優先，實現精細的流量工程。


## BGP為什麼是TCP連線

BGP工作在TCP 179端口，選擇TCP是因為BGP要保證路由更新消息一條不漏地傳遞，丟包就意味著路由表不一致，後果很嚴重。TCP 的可靠傳輸幫 BGP 省去了自己實現重傳的麻煩。這也意味著 BGP Peering 建立需要 TCP 三次握手，所以 Security Group 要放行雙向的 TCP 179。

## AWS AS 7224

這是AWS為Direct Connect和VPN分配的公有ASN，代表了AWS這一側的網路身分。當你的機房路由器和 AWS VGW 建立 BGP 會話，對端 ASN 就填 7224。有趣的是，AWS 在不同服務裡有不同的 ASN：DX 和 VPN 用 7224，AWS Transit Gateway 可以自定義 ASN（預設 64512），而面向公網的 AWS IP 地址段則用 AS16509。