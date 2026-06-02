---
sidebar_position: 1
title: 安裝
description: 如何在本地安裝並執行 Repo Agent。
---

# 安裝

## 環境需求

- Python **>= 3.10**
- `git` 已安裝並可在 PATH 中使用

## 安裝步驟

建議使用虛擬環境，避免污染系統套件：

```bash
# 1. Clone 倉庫
git clone https://github.com/QingSH-J/repo-agent.git
cd repo-agent

# 2. 建立並啟動虛擬環境
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# 3. 以可編輯模式安裝
pip install -e .
```

安裝完成後，`repo-agent` 指令會被注冊到 PATH（由 `pyproject.toml` 的 `[project.scripts]` 定義），可直接呼叫：

```bash
repo-agent --help
```

## 主要相依套件

| 套件 | 版本要求 | 用途 |
| --- | --- | --- |
| `prompt-toolkit` | >= 3.0.0 | REPL 輸入與歷史記錄 |
| `langchain` | >= 1.0.0 | Agent 工具鏈框架 |
| `langchain-deepseek` | >= 1.0.0 | DeepSeek LLM 接入 |
| `python-dotenv` | >= 1.0.0 | 載入 `.env` 環境變數 |
| `rich` | >= 13.0.0 | 彩色終端輸出 |

所有相依皆列於專案根目錄的 `pyproject.toml`，`pip install -e .` 會自動安裝。
