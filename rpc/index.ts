export class RPC {
    static handlers: { name: string; handler: (...a: any[]) => any }[] = [];
    static handler(name: string, handler: (...a: any[]) => any) {
        RPC.handlers.push({ name, handler });
    }
    static async call(callName: string, data: any) {
        const handler = RPC.handlers.find(
            ({ name, handler }) => name === callName
        );
        if (!handler) {
            throw new Error("не найден обработчик");
        }
        return handler.handler(data);
    }
}
