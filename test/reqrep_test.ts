import * as jszmq from '../src/index.js'
const { Req, Rep } = jszmq;

describe('reqrep', function() {
    it('simple request response', function(done) {
        const req = new Req()
        const rep = new Rep()

        rep.bind('ws://localhost:55556')
        req.connect('ws://localhost:55556')

        req.send('Hello')
        rep.once('message', msg => {
            expect(msg.toString()).toEqual('Hello')
            rep.send('World')
        })
        req.once('message', msg => {
            expect(msg.toString()).toEqual('World')
            req.close()
            rep.close()
            done()
        })
    })
    
    it('multiple requests', function (done) {
        const rep = new Rep()
        const reqs: jszmq.Req[] = []
        const last = new Req()

        rep.bind('ws://localhost:55556')

        for (let i = 0; i < 100; i++) {
            reqs[i] = new Req()
            reqs[i].connect('ws://localhost:55556')
        }
        last.connect('ws://localhost:55556')

        rep.on('message', msg => rep.send(msg))
        for (let i = 0; i < 100; i++) {
            reqs[i].send(i.toString())
            reqs[i].once('message', reply => expect(reply.toString()).toEqual(i.toString()))
        }
        last.send('done')
        last.once('message', reply => {
            expect(reply.toString()).toEqual('done')

            for (let i = 0; i < 100; i++)
                reqs[i].close()
            last.close()
            rep.close()

            done()
        })
    })
})