---
title : Docker多階段構建
authors : [jinshan]
date : 2026-05-13
tags : [Docker]
---

從文章[Docker鏡像分層與層共享](/blog/2026-05-13-docker-learn.md)中我們知道，Docker鏡像是由一層一層疊起來的，每一層對應Dockerfile中的一條指令。這些層都是唯讀的，構建完成後不可以修改。

## 問題

構建時候需要用到的東西，運行時候不需要，一個典型的python應用，構建需要
- gcc/build-essential 
- pip
- .h文件
- 測試依賴

但是運行的時候只需要
- python解釋器
- 裝好的包
- 你的代碼

## 先看沒有優化的鏡像有多大

假設現在有一個FastAPI應用:

```
myapp/
├── main.py
├── requirements.txt
└── Dockerfile
```

requirements

```
fastapi==0.110.0
uvicorn==0.29.0
pandas==2.2.0       #觸發了gcc的安裝
numpy==1.26.4
scikit-learn==1.4.0
```

最常見的寫法，能跑就行

```Dockerfile
FROM python:3.11

WORKDIR /app

COPY requirements.txt .

RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

這是本項目構建完後可能出現的大小

```bash
$ docker build -t myapp:naive .
$ docker images myapp:naive

REPOSITORY   TAG     IMAGE ID       SIZE
myapp        naive   a1b2c3d4e5f6   1.08GB
```

1GB 多，原因：

python:3.11 基础镜像本身 900MB+
pip 安装时下载的 wheel 缓存没清
编译 numpy/pandas 留下的编译工具

### pip的緩存是什麼

pip 安装包时，会先把 .whl 文件下载到本地缓存目录，装完之后缓存文件还留着，下次装同一个包可以不用重新下载。

```
安裝 numpy 的過程：

pip 下載 numpy-1.26.4-cp311-linux_x86_64.whl
        ↓
存一份到緩存目錄 ~/.cache/pip/      ← 這份沒用了，但還占著空間
        ↓
解壓安裝到 site-packages/           ← 這才是真正要用的
```

所以鏡像中存了兩份 numpy，一份是 pip 的緩存，一份是安裝好的包。

加入 `--no-cache-dir` 參數，pip 就不會把下載的包存到緩存目錄了：

```Dockerfile   
RUN pip install --no-cache-dir -r requirements.txt
```

### apt安裝包

安裝系統工具時，apt也會留下緩存

```Dockerfile
RUN apt-get update && \
    apt-get install -y build-essential && \
    rm -rf /var/lib/apt/lists/*
```

/var/lib/apt/lists/ 裡面存的是軟件包的索引列表，之後不會用到了。

為什麼分開RUN清理不掉，
```
RUN apt-get install -y gcc        # 第N層，安裝了gcc，留下了緩存
RUN rm -rf /var/lib/apt/lists/*   # 第N+1層：只是標記刪除
```

在同一層產生，在同一層清理，才會真的消失。

即使用了緩存之後，鏡像大小可能並沒有降低多少。

```bash
$ docker images myapp:no-cache

REPOSITORY   TAG        SIZE
myapp        no-cache   870MB
```

## 多階段構建

用一個階段來構建，安裝所有依賴，編譯好包，然後把需要的東西複製到另一個乾淨的階段，這樣就不會把構建過程中產生的垃圾帶到最終鏡像裡了。

```Dockerfile

FROM python:3.11 AS builder

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir \
    --prefix=/install \
    -r requirements.txt

FROM python:3.11-slim AS runtime

WORKDIR /app

COPY --from=builder /install /usr/local

COPY . .

RUN useradd -m appuser
USER appuser

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

如果現在構建：

```bash
$ docker build -t myapp:multistage .
$ docker images myapp

REPOSITORY   TAG          SIZE
myapp        naive        1.08GB
myapp        no-cache     870MB
myapp        multistage   195MB   
```

## 總結

多階段構建的本質是：

構建環境和運行環境分離。