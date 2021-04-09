import Transport from "common/lib/modules/Transport";
export class RPC {
    static handlers: { name: string; handler: (...a: any[]) => any }[] = [];
    static handler(name: string, handler: (...a: any[]) => any) {
        Transport.subscribe(name, {
            callback: async (err, msg) => {
                if (err) {
                    return;
                }
                const rsp = await handler(msg.data);
                Transport.publish(msg.reply!, rsp);
            },
        });
    }
    static async call(callName: string, data: any): Promise<any> {
        const a = await Transport.request(callName, data);
        return a.data;
    }
}
