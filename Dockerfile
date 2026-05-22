# 使用輕量版的 Python 3.11
FROM python:3.11-slim

# 設定工作目錄
WORKDIR /app

# 複製套件清單並安裝
COPY requirements.txt .
# 正式環境必須使用 gunicorn 來取代原本的 flask 開發伺服器
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# 複製專案內的所有檔案到容器中
COPY . .

# 暴露雲端平台常用的 port
EXPOSE 10000

# 使用 Gunicorn 啟動 Flask 應用程式
CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:10000", "app:app"]