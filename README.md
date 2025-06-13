# MONITOR DE BANDA MIKROTIK

Interface web que exibe o gráfico de banda em tempo real de uma conexão com o roteador MikroTik, construída com JavaScript utilizando um servidor em tempo real com Node.js, Express e Socket.IO.

Disciplina de Planejamento e Gerenciamento de Redes - 5º Semestre  
Bacharelado em Sistemas de Informação - IFBA VDC  
Discentes: Gabriela Gomes e Lara Brenda  
Docente: Igor Luiz Oliveira

## ⚙️ Funcionalidades

O sistema oferece monitoramento de banda em tempo real por meio de uma interface web intuitiva para o usuário. Destaca-se pela fácil instalação e implantação, além de possibilitar a comunicação direta com o roteador MikroTik.

## 📦 Instalação

**Pré-requisito:**  
- [Docker](https://www.docker.com/) e [Docker Compose](https://docs.docker.com/compose/) instalados na máquina.

1. Clone o repositório:
    ```bash
    git clone https://github.com/Gabidiela/network-monitor-mk.git
    ```
2. Faça checkout nessa branch:
    ```bash
    git checkout docker-code
    ```
3. Altere o IP no backend/app.py na linha 8:
    ```bash
    SNMP_TARGET    = os.getenv('SNMP_TARGET', '192.168.88.1') #altere paro o IP do seu mikrotik
    ```
4. Altere o IP no docker-compose.yml na linha 7:
    ```bash
       environment:
        - SNMP_TARGET=192.168.88.1 #altere paro o IP do seu mikrotik
    ```

## ▶️ Como Usar

1. Execute o sistema com Docker Compose:
    ```bash
    docker-compose up --build -d
    ```
2. Abra o navegador e acesse:
    ```
    http://localhost:3001
    ```

[JavaScript]: https://img.shields.io/badge/javascript-pink?style=for-the-badge&logo=python&logoColor=gray
[JavaScript-url]: https://www.javascript.com/
