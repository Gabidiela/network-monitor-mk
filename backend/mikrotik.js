const { RouterOSAPI } = require('node-routeros');

class MikroTik {
  constructor() {
    this.client = new RouterOSAPI({
      host: '192.168.88.1',  
      user: 'admin',         
      password: '',          
    });
  }

  async connect() {
    try {
      await this.client.connect();
      console.log('✅ Conexão ao MikroTik concluida com Sucesso');
    } catch (err) {
      console.error('❌ Erro na conexão ao MikroTik:', err.message);
      throw err;
    }
  }

  async getBandwidth(interfaceName) {
    try {
      const result = await this.client.write('/interface/monitor-traffic', [
        `=interface=${interfaceName}`,
        '=once=',
      ]);

      const data = result[0];

      return {
        timestamp: new Date().toLocaleTimeString(),
        rx: data['rx-bits-per-second']
          ? (data['rx-bits-per-second'] / 1e6).toFixed(2)
          : '0.00',
        tx: data['tx-bits-per-second']
          ? (data['tx-bits-per-second'] / 1e6).toFixed(2)
          : '0.00',
      };
    } catch (err) {
      console.error('❌ Erro ao obter dados de tráfego:', err.message);
      throw err;
    }
  }
}

module.exports = MikroTik;
