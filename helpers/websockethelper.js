//'use strict';
//const Websocket = require('ws');
import Websocket from '../node_modules/ws/index.js'

class WebSocketHelper {
    /**
     *
     * @param address
     * @param circuitClient
     */
    constructor(address, circuitClient) {
        const client = new Websocket(address);
        this.wsClient = client;

        client.on('message', e => {
            console.log("New message");
            circuitClient.parseData(JSON.parse(e));
        });

        client.on('error', data => {
            console.log('Error socket');
            console.log(data);
            this.sendInitMsg(circuitClient.getInitMessage())
        });

        client.on('close', () => {
            console.log('Closed socket');
            this.sendInitMsg(circuitClient.getInitMessage())
        });

        client.on('open', () => {
            console.log('WebSocket Client Connected');
            if (client.readyState === client.OPEN) {
                this.sendInitMsg(circuitClient.getInitMessage())
            }
        });
    }

    sendInitMsg(initMessage) {
        this.doSend(initMessage);
        //this.doSend(`START ${clientKey}`);
    }

    doSend(msg) {
        this.wsClient.send(msg);
    }
}

export default WebSocketHelper;
