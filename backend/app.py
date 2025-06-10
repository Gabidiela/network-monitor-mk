# backend/app.py
import os
import time
from flask import Flask
from flask_socketio import SocketIO
from easysnmp import Session, EasySNMPError

# === Configurações via ambiente ===
SNMP_TARGET    = os.getenv('SNMP_TARGET',    '192.168.25.20')
SNMP_COMMUNITY = os.getenv('SNMP_COMMUNITY', 'public')
IF_INDEX       = int(os.getenv('IF_INDEX',    '1'))

# OIDs High-Capacity (bytes in/out)
OID_IN  = f'1.3.6.1.2.1.31.1.1.1.6.{IF_INDEX}'
OID_OUT = f'1.3.6.1.2.1.31.1.1.1.10.{IF_INDEX}'

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

def snmp_counters():
    """Retorna (in_bytes, out_bytes) ou (None, None) em caso de erro."""
    try:
        sess = Session(
            hostname=SNMP_TARGET,
            community=SNMP_COMMUNITY,
            version=2
        )
        in_octets  = sess.get(OID_IN).value
        out_octets = sess.get(OID_OUT).value
        return int(in_octets), int(out_octets)
    except EasySNMPError as e:
        print("❌ SNMP error:", e)
        return None, None

def monitor_loop():
    prev_in, prev_out = snmp_counters()
    prev_in  = prev_in  or 0
    prev_out = prev_out or 0
    time.sleep(1)

    while True:
        curr_in, curr_out = snmp_counters()
        curr_in  = curr_in  if curr_in  is not None else prev_in
        curr_out = curr_out if curr_out is not None else prev_out

        delta_in  = max(curr_in  - prev_in,  0)
        delta_out = max(curr_out - prev_out, 0)

        down_mbps = (delta_in  * 8) / 1_000_000
        up_mbps   = (delta_out * 8) / 1_000_000

        socketio.emit('bandwidth', {
            'download': round(down_mbps, 2),
            'upload':   round(up_mbps,   2)
        })

        prev_in, prev_out = curr_in, curr_out
        time.sleep(0.5)

@socketio.on('connect')
def handle_connect():
    socketio.start_background_task(monitor_loop)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5050, allow_unsafe_werkzeug=True)
