import { server as WebSocketServer, connection as WebSocket, request as WebSocketRequest } from 'websocket'
import {URL} from 'url'
import {toNumber} from 'lodash'
import { EventEmitter } from 'events'
import SocketOptions from './socketOptions'
import Endpoint from './webSocketEndpoint'
import * as http from 'http'
import * as https from 'https'
import {IListener} from './types'

type HttpServer = http.Server | https.Server

class HttpServerListener {
    servers = new Map<string, WebSocketServer>()

    constructor(private server:HttpServer) {

    }

    add(path:string, wsServer: WebSocketServer) {
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
    server:WebSocketServer
    path:string|undefined
    
    private ownHttpServer?: HttpServer

    constructor(public address:string, private httpServer: HttpServer | undefined, private options:SocketOptions) {
        super()
        this.onConnection = this.onConnection.bind(this)

        const url = new URL(address)

        let port

        if (url.port)
            port = toNumber(url.port)
        else if (url.protocol === 'wss')
            port = 443
        else if (url.protocol == 'ws')
            port = 80
        else
            throw new Error('not a websocket address')

        if (!httpServer) {
            httpServer = http.createServer()
            this.ownHttpServer = httpServer
        }
        
        this.server = new WebSocketServer()
        const listener = getHttpServerListener(httpServer)
        this.path = url.pathname
        listener.add(url.pathname, this.server)
        this.server.on('connect', this.onConnection)
        this.server.mount({ httpServer, autoAcceptConnections: true })

        if (this.ownHttpServer) {
            this.ownHttpServer.listen(port, url.hostname)
        }
    }

    onConnection(connection:WebSocket) {
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
