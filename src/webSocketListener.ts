import ws from 'websocket'
import * as url from 'url'
import {toNumber} from 'lodash-es'
import { EventEmitter } from 'events'
import SocketOptions from './socketOptions.js'
import Endpoint from './webSocketEndpoint.js'
import * as http from 'http'
import * as https from 'https'
import * as net from "net"
import {IListener} from './types.js'

type HttpServer = http.Server | https.Server

class HttpServerListener {
    servers = new Map<string, ws.server>()

    constructor(private server:HttpServer) {
        server.on('upgrade', this.onUpgrade.bind(this))
        this.onWsRequest = this.onWsRequest.bind(this)
    }

    onWsRequest(request: ws.request) {
        if (request.requestedProtocols.includes('zws2.0'))
            request.accept('zws2.0', request.origin)
        else
            request.reject(400)
    }

    onUpgrade(request:http.IncomingMessage, socket: net.Socket) {
        if (request.url) {
            const path = url.parse(request.url).pathname

            if (path) {
                const wsServer = this.servers.get(path)

                if (wsServer) {
                    // ws.server emits 'request' event after handleUpgrade()
                    wsServer.handleUpgrade(request, socket)
                    return
                }
            }
        }
        socket.destroy()
    }

    add(path:string, wsServer: ws.server) {
        wsServer.on('request', this.onWsRequest)
        this.servers.set(path, wsServer)
    }

    remove(path:string) {
        this.servers.get(path)?.off('request', this.onWsRequest)
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
        
        // The code is a hack to ensure ws.server is configured without interfering with 'upgrade' event. 
        // ws.server.mount() is not supposed to be called as it adds an 'upgrade' listener disrupting HttpServerListener logic.
        // However, without calling ws.server.mount(), ws.server isn't automatically configured and cannot handle requests properly.
        this.server = new ws.server()
        this.server.mount({ httpServer })
        this.server.unmount()

        const listener = getHttpServerListener(httpServer)
        this.path = addrUrl.pathname!
        listener.add(addrUrl.pathname!, this.server)
        this.server.on('connect', this.onConnection)

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
