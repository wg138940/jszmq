export function assert(condition: boolean, msg: string) {
    if (!condition) {
        throw new Error(`assertion failed: ` + msg);
    }
}
