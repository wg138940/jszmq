import {Buffer} from 'buffer'
import _ from 'lodash'
const {isString} = _
import XSub from './xsub.js'
import {Frame, Msg} from './types.js'

export default class Sub extends XSub {
    subscribe(topic: Frame) {
        if (isString(topic)) {
            const frame = Buffer.concat([Buffer.from([1]), Buffer.from(topic)])
            super.xsend([frame])
        } else if (Buffer.isBuffer(topic)) {
            const frame = Buffer.concat([Buffer.from([1]), topic])
            super.xsend([frame])
        } else
            throw new Error('unsupported topic type')
    }

    unsubscribe(topic: Frame) {
        if (isString(topic)) {
            const frame = Buffer.concat([Buffer.from([0]), Buffer.from(topic)])
            super.xsend([frame])
        } else if (Buffer.isBuffer(topic)) {
            const frame = Buffer.concat([Buffer.from([0]), topic])
            super.xsend([frame])
        } else
            throw new Error('unsupported topic type')
    }

    xsend(msg: Msg) {
        throw new Error('not supported')
    }
}