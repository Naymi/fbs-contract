export interface FlatBufCodec<Dto extends object> {
    decode: (buf: flatbuffers.ByteBuffer) => Dto;
    encode: (builder: flatbuffers.Builder, data: Dto) => number;
}

export interface CodecProtocol<D, R> {
    decode: (raw: R) => Promise<D>;
    encode: (data: D) => Promise<R>;
}

export class FlatBufCodecProtocol<Dto extends object>
    implements CodecProtocol<Dto, Uint8Array> {
    constructor(private readonly codec: FlatBufCodec<Dto>) {}
    async decode(buf: Uint8Array) {
        const b = new flatbuffers.ByteBuffer(buf);
        const data = this.codec.decode(b);
        return data;
    }

    async encode(data: Dto): Promise<Uint8Array> {
        const builder = new flatbuffers.Builder();
        const offset = this.codec.encode(builder, data);
        builder.finish(offset);
        return builder.asUint8Array();
    }
}
