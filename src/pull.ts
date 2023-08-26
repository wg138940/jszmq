import {Buffer} from 'buffer'
import SocketBase from './socketBase.js'
import {IEndpoint} from './types.js'

export default class Pull extends SocketBase {
    protected attachEndpoint(endpoint: IEndpoint) {

    }

    protected endpointTerminated(endpoint: IEndpoint) {
    }

    protected xrecv(endpoint: IEndpoint, ...frames: Buffer[]) {
        this.emit('message', ...frames)
    }
}