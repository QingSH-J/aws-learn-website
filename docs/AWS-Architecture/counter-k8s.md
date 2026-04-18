# Counter Service on Kubernetes

本架構使用一個簡單的網頁Counter服務作為示例，部署在Kubernetes集群上。該服務提供一個API接口，允許用戶增加計數器的值並查詢當前值。

## 架構圖

![Counter Service Architecture](/img/counter-architect.png)

## 技術棧

- Backend: python + Flask
- Storage: Redis
- Container: Docker
- Orchestration: Kubernetes (minikube → EKS)

## 點解

- 為什麼選擇Kubernetes：Kubernetes提供了強大的容器編排能力，能夠自動化部署、擴展和管理容器化應用程序，適合生產環境。
- 為什麼會選擇Redis作為存儲：在K8s中，Pod是短暫的，當Pod重啟的時候，計數如果存在Flask的記憶體中就會失效，擴展為多個Pod計數的時候會互相衝突，所以我把狀態抽離到Redis中，讓Flask變成stateless的應用，這樣就能保證計數的持久化和一致性。

## 具體設計流程

### 網頁

採用index.html作為前端頁面，使用JavaScript來調用後端API接口，實現增加計數器和查詢當前值的功能。

```html
<!DOCTYPE html>
<html>
<head>
  <title>Counter</title>
  <style>
    body { font-family: sans-serif; text-align: center; padding: 50px; }
    h1 { font-size: 80px; margin: 20px; }
    button { padding: 15px 30px; font-size: 18px; cursor: pointer; }
  </style>
</head>
<body>
  <h1 id="count">0</h1>
  <button onclick="increment()">+1</button>
  
  <script>
    const API = 'http://localhost:5001';
    
    async function load() {
      const res = await fetch(`${API}/count`);
      const data = await res.json();
      document.getElementById('count').textContent = data.count;
    }
    
    async function increment() {
      const res = await fetch(`${API}/count`, { method: 'POST' });
      const data = await res.json();
      document.getElementById('count').textContent = data.count;
    }
    
    load();
  </script>
</body>
</html>
```


### 後端設計

```python
from flask import Flask, jsonify
from redis import Redis
from flask_cors import CORS
import os

redis = Redis(host=os.getenv('REDIS_HOST', 'localhost'), port=6379)

app = Flask(__name__)
CORS(app)

@app.route('/count')
def count():
    count = int(redis.get('count') or 0)
    return jsonify(count=count)
    
@app.route('/count', methods=['POST'])
def increment():
    redis.incr('count')
    return count()


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
```

因為設計Flask應用的時候考慮到要部署到K8s上，所以連結Redis的時候應該選擇host=os.getenv('REDIS_HOST', 'localhost')，這樣在本地測試的時候會連結localhost上的Redis，而在K8s裡面部署的時候可以通過環境變量來指定Redis的地址。

用到CORS是因為前端頁面和後端API接口可能會在不同的域名或端口上運行，這樣就會涉及到跨域請求，使用CORS可以解決這個問題。

**為什麼app.run(host='0.0.0.0', port=5001)**

在電腦上或者container中不止一個IP，每個介面都有自己的IP，例如：
- loopback -> 127.0.0.1
- eth0 -> 192.168.1.5
- wlan0 -> 10.0.0.3

一個程式監聽某個port時候，實際上是在問，我要在哪個介面上接受請求

host參數表述決定監聽哪個介面

host='127.0.0.1' 表示只有自己的這台機器可以連結我

```bash
你的 Mac: curl http://127.0.0.1:5001   ✅ 通
別台電腦: curl http://你的IP:5001       ❌ 連不到
Docker container 外: curl ...          ❌ 連不到
```

host='0.0.0.0' 表示監聽所有介面，任何IP都可以連結我

```bash
你的 Mac: curl http://127.0.0.1:5001   ✅ 通
區網其他電腦: curl http://192.168.1.5:5001  ✅ 通
Docker container 外: ...               ✅ 通
```

為什麼container中要用0.0.0.0

這是關鍵，因為container有自己的網絡環境，在container中host='127.0.0.1'指的是自己，不是我的mac。

錯誤的情境如下：

```graph
你的 Mac (localhost)
  │
  │  docker run -p 5001:5001
  ▼
┌─────────────────────────────┐
│ Container (有自己的網路)     │
│                              │
│  Flask 監聽 127.0.0.1:5001  │  ← 只接受 container 內部的請求
│                              │
│  eth0: 172.17.0.2           │
└─────────────────────────────┘
```

你從 Mac 下 curl `http://localhost:5001`：

- 請求到達 Docker 的 port 5001 映射
- Docker 把請求轉發到 container 的 172.17.0.2:5001（eth0 介面）
- Flask 沒監聽這個介面（它只監聽 container 內部的 127.0.0.1）
- 連線被拒絕

## Dockerfile

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

EXPOSE 5001

CMD ["python", "app.py"]

```

From python:3.12-slim：使用官方的 Python 3.12 瘦身版作為基礎映像，減少映像大小，大小只有150mb-160mb左右。

WORKDIR /app：設置工作目錄為 /app，後續的命令都在這個目錄下執行。

COPY requirements.txt .：將當前目錄下的 requirements.txt 文件複製到容器的 /app 目錄中。

RUN pip install --no-cache-dir -r requirements.txt：在容器內部執行 pip install 命令，安裝 requirements.txt 中列出的 Python 依賴包。--no-cache-dir 選項可以避免緩存安裝包，減少映像大小。

COPY app.py .：將當前目錄下的 app.py 文件複製到容器的 /app 目錄中。

EXPOSE 5001：聲明容器將監聽 5001 端口，這是 Flask 應用運行的端口。

CMD ["python", "app.py"]：設置容器啟動時執行的命令，這裡是運行 app.py 文件，啟動 Flask 應用。


## K8s部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis
        ports:
        - containerPort: 6379
---
apiVersion: v1
kind: Service
metadata:
  name: redis
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
```

- kind: Deployment 定義了一個名為 redis 的部署
- metadata.name: redis 是部署的名稱
- spec.replicas: 1 定義了部署的副本數量，這裡是1，表示只運行一個 Redis 實例
- spec.selector.matchLabels 定義了選擇器，用於匹配 Pod 的標籤，這裡是 app: redis，表示選擇具有 app=redis 標籤的 Pod
- spec.template 定義了 Pod 的模板
- metadata.labels 定義了 Pod 的標籤，這裡是 app: redis，這樣部署會創建一個帶有 app=redis 標籤的 Pod，必須和 selector.matchLabels 中的標籤匹配
- spec.containers 定義了容器的規格，這裡定義了一個名為 redis 的容器，使用 redis 映像，並暴露 6379 端口

- kind: Service 定義了一個名為 redis 的服務
- metadata.name: redis 是服務的名稱
- spec.selector 定義了服務的選擇器，這裡是 app: redis，表示服務會選擇具有 app=redis 標籤的 Pod 作為後端
- spec.ports 定義了服務的端口，這裡是將服務的 6379 端口映射到後端 Pod 的 6379 端口，這樣其他應用就可以通過服務的名稱 redis 和端口 6379 來訪問 Redis 實例，而不需要關心 Pod 的具體 IP 地址
  
### 關於Service

Service扮演了K8s中的交通指揮官和但一進入點的角色，因為Pod是短暫而且動態的，它們隨時會因為報錯、擴容或者更新以及刪除而重新分配一個新的IP地址，如果你的應用直接去連結Pod的IP地址，一旦Pod重啟，連線就會斷掉。

service的核心職責：
- 提供穩定的訪問點：Service會分配一個固定的IP地址和DNS名稱，讓其他應用可以通過這個固定的地址來訪問後端的Pod，而不需要關心Pod的實際IP地址。
- 負載均衡：當Service後面有多個Pod時，Service會自動將請求分發到這些Pod上，實現負載均衡，確保應用的高可用性和性能。
- 服務發現：Service還提供了服務發現的功能，其他應用可以通過Service的DNS名稱來發現和訪問後端的Pod，這樣就實現了應用之間的解耦和靈活的通信。


## 遇到的問題

### 1. ErrImageNeverPull:minikube 看不到本機 image

kubectl get pods 顯示 ErrImageNeverPull

原因是minikube有自己獨立的Docker Daemon，本機build的image在minikube裡面是看不到的，所以當你在minikube裡面部署一個Pod，指定的image是你本機build的image，minikube就會找不到這個image，然後報錯 ErrImageNeverPull。

解決方法：
- 用minikube image load 把本機的image加載到minikube裡面，這樣minikube就能找到這個image了。
- 或者eval($(minikube docker-env))，這樣就讓你的docker client直接連結到minikube的docker daemon，這樣你在本機build的image就直接存在minikube裡面了。

### Container之間如何通信

在K8s中，flask應用如何連結到redis呢？因為flask和redis是兩個不同的Pod，這兩個Pod是分別運行在不同的容器裡面的，這時候就需要通過Service來實現通信。

flask應用可以通過redis服務的名稱和端口來連接redis，例如：

```python
import os
import redis

redis_host = os.getenv('REDIS_HOST', 'localhost')
redis_port = os.getenv('REDIS_PORT', 6379)

r = redis.Redis(host=redis_host, port=redis_port)
```

**一** 在純Docker環境中

網路層面，使用docker network

Docker預設每個container是彼此隔離的--每個container在自己的網路空間裡面，要讓兩個container互相通信，必須把它們加入到同一個network裡面。

```bash
docker network create counter-network
```

這個命令創建一個叫做counter-network的虛擬網路，。

```bash
--network counter-network
```

把flask和redis的container都加入到counter-network這個網路裡面，這樣它們就能通過容器名稱來互相通信了。

redis container -> 172.18.0.2 拿到其中一個IP地址
flask container -> 172.18.0.3 拿到另一個IP地址

這時候Flask應用可以通過redis = Redis(host='172.18.0.2', port=6379)來連結redis，因為在同一個network裡面，容器名稱redis就會被解析成對應的IP地址。

**問題** IP地址是會變的，container重啟後可能會獲得新的IP地址，這樣Flask應用就無法再通過舊的IP地址來連接redis了。

名字解析的辦法：Docker內建DNS

Docker network有一個神奇的機制，在同一個自訂的network中，container可以用 --name 找到對方，例如：

```bash
docker run --name redis --network counter-network redis
docker run --name flask --network counter-network flask
```

Docker會把它們註冊為內部的DNS服務，這樣flask container就可以通過redis這個名字來連結redis container了，例如：

```python
redis = Redis(host='redis', port=6379)
```

**踩坑** 預設的default bridge network沒有這個DNS功能，所以如果你沒有創建自訂的network，而是直接用預設的default bridge network，那麼flask container就無法通過redis這個名字來連結redis container了，這時候就會報錯找不到主機。所以在使用Docker的時候，建議一定要創建一個自訂的network，這樣就能享受到Docker內建DNS帶來的便利了。


**二** 在Kubernetes環境中

```yaml
# ConfigMap
data:
  REDIS_HOST: redis

# Service
apiVersion: v1
kind: Service
metadata:
  name: redis           # ← 關鍵
spec:
  selector:
    app: redis
  ports:
  - port: 6379
```

Flask連redis的時候，環境變量REDIS_HOST的值是redis，這個redis是什麼？

它是k8s Service的名字，被k8s內部DNS解析。

k8s的解決辦法：Service + CoreDNS

Docker的辦法是DNS直接指向某個container，但是k8s多了一層，Service不是指向pod，而是指向一組pod。

```graph
redis Service (名字叫 redis,有個 ClusterIP 例如 10.96.0.50)
  ↓ 透過 selector: app=redis 找到
redis Pod 1  (IP 10.244.0.5)
redis Pod 2  (IP 10.244.0.8)  ← 如果 scale 到 2 個
```

Flask pod 查 redis 的 DNS
- Flask 裡寫 REDIS_HOST=redis
- Flask 呼叫 Redis(host='redis', port=6379)
- Linux 的 DNS 解析把 redis 送給 CoreDNS（K8s 內建的 DNS server）
- CoreDNS 回傳 10.96.0.50（Service 的 ClusterIP）
- Flask 連到這個 IP
- K8s 的 kube-proxy 把這個連線負載平衡到某個實際的 redis pod


## 參考資料

- [Docker Networking](https://docs.docker.com/network/)
- [Kubernetes Services](https://kubernetes.io/docs/concepts/services-networking/service/)