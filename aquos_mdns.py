# ========================================
# 📁 フォルダ: ~/farm-ai2
# 📄 ファイル: aquos_mdns.py
# 📅 作成日: 2026/08/17
# ========================================
# 🌐 AQUOS mDNS 自動公開
#
# 概要:
# AQUOSの現在のIPアドレスを定期的に確認し、
# IPアドレスが変わった場合はmDNSを更新して
# 「aquos.local」という名前でWebサーバーを公開する。
#
# 公開先:
#   http://aquos.local:10000
#
# 使用ライブラリ:
#   zeroconf
#
# 備考:
# farm-ai2 の index.js から自動起動する。
# ========================================

import socket
import subprocess
import time

from zeroconf import Zeroconf, ServiceInfo


# ========================================
# 🌐 AQUOSの現在IPアドレスを取得
# ========================================

def get_ip():
    # wlan0のIPv4アドレスを取得する。
    result = subprocess.check_output(
        ["sh", "-c", "ip addr show wlan0 | grep 'inet '"],
        stderr=subprocess.DEVNULL
    ).decode().strip()

    # IPv4アドレスだけを取り出す。
    return result.split()[1].split("/")[0]


# ========================================
# 📡 mDNSサービスを作成
# ========================================

def create_service(ip):
    # 現在のIPアドレスでmDNSサービス情報を作成する。
    return ServiceInfo(
        "_http._tcp.local.",
        "AQUOS Web._http._tcp.local.",
        addresses=[socket.inet_aton(ip)],
        port=10000,
        properties={"path": "/"},
        server="aquos.local.",
    )


# ========================================
# 🚀 mDNS開始
# ========================================

zeroconf = Zeroconf()

current_ip = None
current_info = None


try:

    # ========================================
    # 💓 IPアドレス監視
    # ========================================

    while True:

        # 現在のIPアドレスを取得する。
        try:
            new_ip = get_ip()
        except Exception as e:
            print(f"❌ IP取得エラー: {e}", flush=True)
            time.sleep(5)
            continue

        # ========================================
        # 🔄 IPアドレス変更を検知
        # ========================================

        if new_ip != current_ip:

            # 現在のIPアドレスを表示する。
            print(f"🌐 AQUOS IP : {new_ip}", flush=True)

            # 以前のmDNS登録がある場合は解除する。
            if current_info is not None:
                try:
                    zeroconf.unregister_service(current_info)
                    print("🔄 旧mDNS登録を解除しました", flush=True)
                except Exception as e:
                    print(f"⚠️ 旧mDNS解除エラー: {e}", flush=True)

            # 新しいIPでmDNSサービスを作成する。
            current_info = create_service(new_ip)

            # 新しいIPでmDNSを登録する。
            zeroconf.register_service(current_info)

            # 現在のIPを記録する。
            current_ip = new_ip

            # 更新完了を表示する。
            print(
                f"📡 aquos.local を {new_ip} に更新しました",
                flush=True
            )

        # 5秒ごとにIPアドレスを確認する。
        time.sleep(5)


# ========================================
# 🛑 終了処理
# ========================================

except KeyboardInterrupt:

    print("🛑 AQUOS mDNSを停止します", flush=True)

    # mDNS登録を解除する。
    if current_info is not None:
        try:
            zeroconf.unregister_service(current_info)
        except Exception:
            pass

    # Zeroconfを終了する。
    zeroconf.close()

    print("📡 AQUOS mDNS停止完了", flush=True)
