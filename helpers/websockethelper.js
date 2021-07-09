//'use strict';
//const Websocket = require('ws');
import Websocket from '../node_modules/ws/index.js'

class WebSocketHelper {
    /**
     *
     * @param address
     * @param clientKey
     * @param timingClient
     */
    constructor(address, clientKey, timingClient) {
        const client = new Websocket(address);
        this.wsClient = client;

        client.on('message', e => {
            console.log("Message");
            timingClient.parseData(JSON.parse(e));
            console.log(e);
        });

        client.on('error', data => {
            console.log(data);
            this.sendInitMsg(clientKey)
        });

        client.on('close', () => {
            console.log('Closed');
            this.sendInitMsg(clientKey)
        });

        client.on('open', () => {
            console.log('WebSocket Client Connected');
            if (client.readyState === client.OPEN) {
                this.sendInitMsg(clientKey)
            }
        });
    }

    sendInitMsg(clientKey) {
        this.doSend("{\"$type\":\"BcStart\",\"ClientKey\":\"2gcircuit\",\"ResourceId\":19495,\"Timing\":true,\"Notifications\":true,\"Security\":\"THIRD PARTY TV\"}");
        //this.doSend(`START ${clientKey}`);
    }

    doSend(msg) {
        this.wsClient.send(msg);
    }
}

//exports.WebSocketHelper = WebSocketHelper;
export default WebSocketHelper;
