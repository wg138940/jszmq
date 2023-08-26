import ws from 'websocket';
import * as url from 'url'
import {toNumber} from 'lodash-es'
import { EventEmitter } from 'events'
import SocketOptions from './socketOptions.js'
import Endpoint from './webSocketEndpoint.js'
import * as http from 'http'
import * as https from 'https'
import {IListener} from './types.js'

type HttpServer = http.Server | https.Server

class HttpServerListener {
    servers = new Map<string, ws.server>()

    constructor(private server:HttpServer) {

    }

    add(path:string, wsServer: ws.server) {
        this.servers.set(path, wsServer)
    }

    remove(path:string) {
        this.servers.delete(path)

        if (this.servers.size === 0)
            listeners.delete(this.server)
    }
}

const listeners = new Map<HttpServer, HttpServerListener>()

function getHttpServerListener(httpServer:HttpServer) {
    let listener = listeners.get(httpServer)

    if (listener)
        return listener

    listener = new HttpServerListener(httpServer)
    listeners.set(httpServer, listener)

    return listener
}

export default class WebSocketListener extends EventEmitter implements IListener {
    server:ws.server
    path:string|undefined
    
    private ownHttpServer?: HttpServer

    constructor(public address:string, private httpServer: HttpServer | undefined, private options:SocketOptions) {
        super()
        this.onConnection = this.onConnection.bind(this)

        // TODO: nolint @deprecated
        const addrUrl = url.parse(address)

        let port

        if (addrUrl.port)
            port = toNumber(addrUrl.port)
        else if (addrUrl.protocol === 'wss')
            port = 443
        else if (addrUrl.protocol == 'ws')
            port = 80
        else
            throw new Error('not a websocket address')

            
        if (!addrUrl.hostname || !addrUrl.pathname)
            throw new Error(
                `invalid hostname ('${addrUrl.hostname}') or pathname ('${addrUrl.pathname}')` +
                `from url.parse('${this.address}')`)

        if (!httpServer) {
            httpServer = http.createServer()
            this.ownHttpServer = httpServer
        }
        
        this.server = new ws.server()
        const listener = getHttpServerListener(httpServer)
        this.path = addrUrl.pathname!
        listener.add(addrUrl.pathname!, this.server)
        this.server.on('connect', this.onConnection)
        this.server.mount({ httpServer, autoAcceptConnections: true })

        if (this.ownHttpServer) {
            this.ownHttpServer.listen(port, addrUrl.hostname!)
        }
    }

    onConnection(connection:ws.connection) {
        const endpoint = new Endpoint(connection, this.options)
        this.emit('attach', endpoint)
    }

    close(): void {
        if (this.path && this.httpServer)
            getHttpServerListener(this.httpServer).remove(this.path)

        this.server.shutDown()
        if (this.ownHttpServer)
            this.ownHttpServer.close(console.error)
    }
}
