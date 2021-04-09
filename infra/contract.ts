import { CodecProtocol, FlatBufCodecProtocol } from "./protocol/codec";
import { ValidationProtocol } from "./protocol/validation";

export class Contract<Dto extends object>
    implements CodecProtocol<Dto, Uint8Array> {
    constructor(
        private transportContract: FlatBufCodecProtocol<Dto>,
        private validationContract: ValidationProtocol<Dto>
    ) {}
    decode: (raw: Uint8Array) => Promise<Dto> = async (raw) => {
        const data = this.transportContract.decode(raw);
        const validateData = await this.validationContract.validate(data);
        return validateData;
    };
    encode: (data: Dto) => Promise<Uint8Array> = async (data) => {
        const validateData = await this.validationContract.validate(data);
        const raw = this.transportContract.encode(validateData);
        return raw;
    };
}
