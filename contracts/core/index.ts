import { flatbuffers } from "flatbuffers";
import { ClassType, transformAndValidate } from "class-transformer-validator";
import { IsString } from "class-validator";
import { RPC } from "../../rpc";

interface NewContract<D, R> {
    decode: (raw: R) => Promise<D>;
    encode: (data: D) => Promise<R>;
}

interface IValidationContract<Dto> {
    validate: (data: any) => Promise<Dto>;
}

interface FlatBufCodec<D extends object> {
    decode: (buf: flatbuffers.ByteBuffer) => D;
    encode: (builder: flatbuffers.Builder, data: D) => number;
}

export class TransportContract<Dto extends object>
    implements NewContract<Dto, Uint8Array> {
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

export class ValidationContract<Dto extends object>
    implements IValidationContract<Dto> {
    constructor(private readonly Dto: ClassType<Dto>) {}
    async validate(data: any): Promise<Dto> {
        return (await transformAndValidate(this.Dto, data)) as Dto;
    }
}

export class NContract<Dto extends object>
    implements NewContract<Dto, Uint8Array> {
    constructor(
        private transportContract: TransportContract<Dto>,
        private validationContract: ValidationContract<Dto>
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

export class NContractCreator {
    static create<D extends object>(codec: FlatBufCodec<D>, Dto: ClassType<D>) {
        return new NContract(
            new TransportContract(codec),
            new ValidationContract(Dto)
        );
    }
}

export class ErrorResponseDto {
    @IsString()
    message!: string;
}

export class ResponseContract<
    Dto extends object,
    ErrorDto extends object = ErrorResponseDto
> {
    constructor(
        public success: NContract<Dto>,
        public error: NContract<ErrorDto>
    ) {}
}

export class ErrorResponseCodec implements FlatBufCodec<ErrorResponseDto> {
    constructor(
        private readonly Response: any,
        private readonly ErrorResponse: any,
        private readonly Body: any
    ) {}

    decode(buf: flatbuffers.ByteBuffer) {
        const data = this.Response.getRoot(buf);
        const body = data.body(this.ErrorResponse())!;
        return {
            message: body.message()!,
        };
    }

    encode(builder: flatbuffers.Builder, data: ErrorResponseDto): number {
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
        return NContractCreator.create(
            new ErrorResponseCodec(response, errorResponse, body),
            ErrorResponseDto
        );
    }
}

export class ResponseContractCreator {
    static create<SuccessDto extends object>(
        successResponseContract: NContract<SuccessDto>,
        response: any,
        errorResponse: any,
        body: any
    ) {
        return new ResponseContract<SuccessDto>(
            successResponseContract,
            ErrorResponseContractCreator.create(response, errorResponse, body)
        );
    }
}

export class ContractCreator {
    static create<SuccessResponseDto extends object, RequestDto extends object>(
        eventName: string,
        requestContract: NContract<RequestDto>,
        successResponseContract: NContract<SuccessResponseDto>,
        Response: any,
        Body: any,
        ErrorResponse: any,
        SuccessResponse: any
    ) {
        return new Contract<SuccessResponseDto, RequestDto>(
            eventName,
            requestContract,
            ResponseContractCreator.create<SuccessResponseDto>(
                successResponseContract,
                Response,
                ErrorResponse,
                Body
            ),
            Response,
            Body,
            ErrorResponse,
            SuccessResponse
        );
    }
}

export class Contract<
    SuccessResponseDto extends object,
    RequestDto extends object
> {
    constructor(
        public eventName: string,
        public requestContract: NContract<RequestDto>,
        public responseContract: ResponseContract<SuccessResponseDto>,
        public Response: any,
        public Body: any,
        public ErrorResponse: any,
        public SuccessResponse: any
    ) {}

    encodeRequest(data: any) {
        return this.requestContract.encode(data);
    }

    decodeRequest(buf: Uint8Array) {
        return this.requestContract.decode(buf);
    }

    encodeErrorResponse(data: any) {
        return this.responseContract.error.encode(data);
    }
    encodeSuccessResponse(data: any) {
        return this.responseContract.success.encode(data);
    }

    decodeErrorResponse(data: any) {
        return this.responseContract.error.decode(data);
    }

    decodeResponse(buf: Uint8Array) {
        const byteBuilder = new flatbuffers.ByteBuffer(buf);
        const data = this.Response.getRoot(byteBuilder);
        const bodyType = data.bodyType();
        if (bodyType === this.Body.ErrorResponse) {
            const errorBody = data.body(new this.ErrorResponse())!;
            throw new Error(errorBody.message()!);
        }
        const body = data.body(new this.SuccessResponse())!;
        return {
            result: body.result(),
        };
    }
}

export class ContractService {
    static async call<ResponseDto extends object, RqDto extends object>(
        contract: Contract<ResponseDto, RqDto>,
        data: RqDto
    ) {
        const payload = await contract.encodeRequest(data);
        const response = await RPC.call(contract.eventName, payload);
        return contract.decodeResponse(response);
    }
    static handler<ResponseDto extends object, RqDto extends object>(
        contract: Contract<ResponseDto, RqDto>,
        contractHandler: (...a: any) => any
    ) {
        RPC.handler(contract.eventName, async function (data: any) {
            const payload = await contract.decodeRequest(data);
            try {
                const response = await contractHandler(
                    payload,
                    contractHandler
                );
                const result = await contract.encodeSuccessResponse(response);
                return result;
            } catch (error) {
                return contract.encodeErrorResponse({ message: error.message });
            }
        });
    }
}

export class ContractServiceDecorator {
    static handler<ResponseDto extends object, RqDto extends object>(
        contract: Contract<ResponseDto, RqDto>
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
