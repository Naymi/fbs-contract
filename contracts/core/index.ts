import {
    FlatBufCodec,
    CodecProtocol,
    FlatBufCodecProtocol,
} from "./../../infra/protocol/codec";
import { flatbuffers } from "flatbuffers";
import { ClassType } from "class-transformer-validator";
import { IsString } from "class-validator";
import { RPC } from "../../rpc";
import { CommunicationContract } from "../../infra/communication";
import { ValidationProtocol } from "../../infra/protocol/validation";

export class Contract<Dto extends object>
    implements CodecProtocol<Dto, Uint8Array> {
    constructor(
        readonly transportContract: FlatBufCodecProtocol<Dto>,
        readonly validationContract: ValidationProtocol<Dto>
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

export class FlatBufContractCreator {
    static create<Dto extends object>(
        codec: FlatBufCodec<Dto>,
        Dto: ClassType<Dto>
    ): Contract<Dto> {
        return new Contract(
            new FlatBufCodecProtocol(codec),
            new ValidationProtocol(Dto)
        );
    }
}

export class ErrRsDto {
    @IsString()
    message!: string;
}

export class ResponseContract<
    RqDto extends object,
    ErRsDto extends object = ErrRsDto
> {
    constructor(
        public success: Contract<RqDto>,
        public error: Contract<ErRsDto>
    ) {}
}

export class ErrorResponseCodec implements FlatBufCodec<ErrRsDto> {
    constructor(
        private readonly Response: any,
        private readonly ErrorResponse: any,
        private readonly Body: any
    ) {}

    decode(buf: flatbuffers.ByteBuffer) {
        const data = this.Response.getRoot(buf);
        const body = data.body(new this.ErrorResponse())!;
        return {
            message: body.message()!,
        };
    }

    encode(builder: flatbuffers.Builder, data: ErrRsDto): number {
        return this.Response.create(
            builder,
            this.Body.ErrorResponse,
            this.ErrorResponse.create(
                builder,
                builder.createString(data.message)
            )
        );
    }
}

export class ErrorResponseContractCreator {
    static create(response: any, errorResponse: any, body: any) {
        return FlatBufContractCreator.create(
            new ErrorResponseCodec(response, errorResponse, body),
            ErrRsDto
        );
    }
}

export class ResponseContractCreator {
    static create<RsDto extends object>(
        successResponseContract: Contract<RsDto>,
        response: any,
        errorResponse: any,
        body: any
    ) {
        return new ResponseContract<RsDto>(
            successResponseContract,
            ErrorResponseContractCreator.create(response, errorResponse, body)
        );
    }
}

export class RPCContractService {
    constructor(private readonly driver: { call: any; handler: any }) {}
    async call<RqDto extends object, RsDto extends object>(
        contract: CommunicationContract<RqDto, RsDto>,
        data: RqDto
    ) {
        const payload = await contract.encodeRequest(data);
        const response = await this.driver.call(contract.eventName, payload);
        return contract.decodeResponse(response);
    }
    handler<ResponseDto extends object, RqDto extends object>(
        contract: CommunicationContract<ResponseDto, RqDto>,
        contractHandler: (...a: any) => any
    ) {
        this.driver.handler(
            contract.eventName,
            async function (data: any): Promise<Uint8Array> {
                const payload = await contract.decodeRequest(data);
                try {
                    const response = await contractHandler(
                        payload,
                        contractHandler
                    );
                    const successResponse = await contract.encodeSuccessResponse(
                        response
                    );
                    return successResponse;
                } catch (error) {
                    const errorResponse = contract.encodeErrorResponse({
                        message: error.toString(),
                    });
                    return errorResponse;
                }
            }
        );
    }
}

export class ContractService {
    static async call<RqDto extends object, RsDto extends object>(
        contract: CommunicationContract<RqDto, RsDto>,
        data: RqDto
    ) {
        const payload = await contract.encodeRequest(data);
        const response = await RPC.call(contract.eventName, payload);
        return contract.decodeResponse(response);
    }
    static handler<ResponseDto extends object, RqDto extends object>(
        contract: CommunicationContract<ResponseDto, RqDto>,
        contractHandler: (...a: any) => any
    ) {
        RPC.handler(
            contract.eventName,
            async function (data: any): Promise<Uint8Array> {
                const payload = await contract.decodeRequest(data);
                try {
                    const response = await contractHandler(
                        payload,
                        contractHandler
                    );
                    const successResponse = await contract.encodeSuccessResponse(
                        response
                    );
                    return successResponse;
                } catch (error) {
                    const errorResponse = contract.encodeErrorResponse({
                        message: error.toString(),
                    });
                    return errorResponse;
                }
            }
        );
    }
}

export class ContractServiceDecorator {
    static handler<RqDto extends object, RsDto extends object>(
        contract: CommunicationContract<RsDto, RqDto>
    ): (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) => void {
        return function (_, __, descriptor: PropertyDescriptor): void {
            ContractService.handler(contract, descriptor.value);
        };
    }
}
