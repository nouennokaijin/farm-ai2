# ========================================
# 📁 フォルダ: ~/farm-ai2
# 📄 ファイル: aquos_mdns.py
# 📅 作成日: 2026/08/17
# ========================================
# 🌐 AQUOS mDNS 自動公開
#
# 概要:
# AQUOSの現在のIPアドレスを取得し、
# mDNSを使って「aquos.local」という名前で
# Webサーバーをネットワーク上に公開する。
#
# 公開先:
#   http://aquos.local:10000
#
# 使用ライブラリ:
#   zeroconf
#
# 起動:
#   python ~/aquos_mdns.py
#
# 備考:
# farm-ai2 の index.js から自動起動する。
# ========================================

import socket
import time

from zeroconf import Zeroconf, ServiceInfo


# ========================================
# 🌐 AQUOSのIPアドレスを取得
# ========================================
# 外部へ通信できるソケットを一時的に作り、
# 現在使用しているネットワークのIPアドレスを取得する。
# ========================================

s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

s.connect(("8.8.8.8", 80))

ip = s.getsockname()[0]

s.close()


print(f"AQUOS IP : {ip}")
print("mDNS    : aquos.local")


# ========================================
# 📡 mDNSサービス情報を作成
# ========================================
# AQUOSのWebサーバーを
# 「aquos.local:10000」として公開する。
# ========================================

info = ServiceInfo(
    "_http._tcp.local.",
    "AQUOS Web._http._tcp.local.",
    addresses=[socket.inet_aton(ip)],
    port=10000,
    properties={"path": "/"},
    server="aquos.local.",
)


# ========================================
# 🚀 mDNSサービス開始
# ========================================

zeroconf = Zeroconf()

zeroconf.register_service(info)


print("aquos.local を公開しました")
print("停止: Ctrl+C")


# ========================================
# 💓 mDNSサービス維持
# ========================================
# プログラムが終了するまで、
# mDNSによる公開を維持する。
# ========================================

try:

    while True:
        time.sleep(1)


# ========================================
# 🛑 終了処理
# ========================================

except KeyboardInterrupt:

    print("🛑 AQUOS mDNSを停止します")

    zeroconf.unregister_service(info)

    zeroconf.close()

    print("📡 AQUOS mDNS停止完了")
