import os
import time
from flask import Flask
from flask_socketio import SocketIO
from easysnmp import Session, EasySNMPError

# === Configurações via ambiente ===
SNMP_TARGET    = os.getenv('SNMP_TARGET', '192.168.88.1')
SNMP_COMMUNITY = os.getenv('SNMP_COMMUNITY', 'public')
# Nome da interface padrão (ether1, bridge, etc.)
IF_NAME        = os.getenv('IF_NAME', 'ether1')

app = Flask(__name__)
# async_mode 'eventlet' para suportar WebSockets
socketio = SocketIO(app, cors_allowed_origins='*', async_mode='eventlet')

# variável global que armazena a interface selecionada pelo client
current_iface = IF_NAME


def get_if_index(iface_name: str) -> int:
    """
    Faz SNMP walk em IF-MIB::ifDescr e retorna o ifIndex para iface_name.
    Usa row.oid ao invés de row.oid_index para maior compatibilidade.
    """
    sess = Session(hostname=SNMP_TARGET, community=SNMP_COMMUNITY, version=2)
    try:
        for row in sess.walk('1.3.6.1.2.1.2.2.1.2'):  # IF-MIB::ifDescr
            if row.value == iface_name:
                idx_str = row.oid.split('.')[-1]
                return int(idx_str)
    except EasySNMPError as e:
        print(f"❌ SNMP-walk error: {e}")
    raise RuntimeError(f"Interface '{iface_name}' não encontrada via SNMP")


def snmp_counters(oid_in: str, oid_out: str, fallback_32: bool = True) -> tuple[int, int]:
    """
    Lê o contador high-capacity; faz fallback para 32-bit se não suportado.
    Retorna (in_bytes, out_bytes).
    """
    sess = Session(hostname=SNMP_TARGET, community=SNMP_COMMUNITY, version=2)
    try:
        in_octets  = sess.get(oid_in).value
        out_octets = sess.get(oid_out).value
    except EasySNMPError:
        if fallback_32:
            idx = oid_in.split('.')[-1]
            in32  = f'1.3.6.1.2.1.2.2.1.10.{idx}'
            out32 = f'1.3.6.1.2.1.2.2.1.16.{idx}'
            in_octets  = sess.get(in32).value
            out_octets = sess.get(out32).value
        else:
            raise
    return int(in_octets), int(out_octets)


@socketio.on('changeInterface')
def handle_change_interface(new_iface):
    """
    Captura evento do client para trocar de interface.
    """
    global current_iface
    current_iface = new_iface
    print(f"[Socket.IO] Interface trocada para: {current_iface}")


@socketio.on('connect')
def handle_connect():
    socketio.start_background_task(monitor_loop)


def monitor_loop():
    """
    Loop principal: a cada 1s faz SNMP-walk dinâmico, calcula taxas e emite via Socket.IO.
    Usa socketio.sleep() para não bloquear o event loop.
    """
    prev_in = prev_out = 0
    prev_time = time.time()

    while True:
        try:
            idx = get_if_index(current_iface)
        except RuntimeError as e:
            print(f"⚠️ {e}")
            socketio.sleep(5)
            continue

        # monta OIDs high-capacity
        oid_in  = f'1.3.6.1.2.1.31.1.1.1.6.{idx}'
        oid_out = f'1.3.6.1.2.1.31.1.1.1.10.{idx}'

        # lê counters (HC ou 32-bit se falhar)
        in_bytes, out_bytes = snmp_counters(oid_in, oid_out, fallback_32=True)

        # aguarda 1 segundo sem bloquear
        socketio.sleep(1)
        curr_time = time.time()
        dt = curr_time - prev_time if curr_time > prev_time else 1.0

        # cálculo de delta e taxa em Mbps com precisão de 3 casas
        delta_in  = max(in_bytes  - prev_in,  0)
        delta_out = max(out_bytes - prev_out, 0)
        down_mbps = (delta_in  * 8) / (dt * 1_000_000)
        up_mbps   = (delta_out * 8) / (dt * 1_000_000)

        # debug opcional
        print(f"[SNMP] idx={idx} in={in_bytes} out={out_bytes} dt={dt:.2f}s ->"
              f" down={down_mbps:.3f}Mbps up={up_mbps:.3f}Mbps")

        # emite ao front com mais precisão
        socketio.emit('bandwidth', {
            'download': round(down_mbps, 3),
            'upload':   round(up_mbps,   3)
        })

        prev_in, prev_out, prev_time = in_bytes, out_bytes, curr_time


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5050)
