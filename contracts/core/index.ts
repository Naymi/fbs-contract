import { flatbuffers } from "flatbuffers";
import { ClassType, transformAndValidate } from "class-transformer-validator";
import { IsString } from "class-validator";
import { RPC } from "../../rpc";
import { RPC as FBRPC } from "../Player/hasState/core_generated";

export interface FBSInstance {
    getRoot(bb: flatbuffers.ByteBuffer, ...a: any[]): Response;
    getSizePrefixedRoot(bb: flatbuffers.ByteBuffer, ...a: any[]): Response;
    start(builder: flatbuffers.Builder): {};
    end(builder: flatbuffers.Builder): flatbuffers.Offset;
    create(builder: flatbuffers.Builder, ...a: any[]): flatbuffers.Offset;
}

interface FBSResponse<Body = any> extends FBSInstance {
    bodyType(): number;
    body(obj: Body): Body | null;
    addBodyType(builder: flatbuffers.Builder, bodyType: number): {};
    addBody(builder: flatbuffers.Builder, bodyOffset: flatbuffers.Offset): {};
    end(builder: flatbuffers.Builder): flatbuffers.Offset;
    create(
        builder: flatbuffers.Builder,
        bodyType: number,
        bodyOffset: flatbuffers.Offset
    ): flatbuffers.Offset;
}

export interface IErrorResponse {
    __init(i: number, bb: flatbuffers.ByteBuffer): IErrorResponse;
    getRoot(bb: flatbuffers.ByteBuffer, obj: IErrorResponse): IErrorResponse;
    getSizePrefixedRoot(
        bb: flatbuffers.ByteBuffer,
        obj: IErrorResponse
    ): IErrorResponse;
    message(): string | null;
    message(optionalEncoding: flatbuffers.Encoding): string | Uint8Array | null;
    message(optionalEncoding: any): string | Uint8Array | null;
    start(builder: flatbuffers.Builder): {};
    addMessage(
        builder: flatbuffers.Builder,
        messageOffset: flatbuffers.Offset
    ): {};
    end(builder: flatbuffers.Builder): flatbuffers.Offset;
    finishBuffer(builder: flatbuffers.Builder, offset: flatbuffers.Offset): {};
    finishSizePrefixedBuffer(
        builder: flatbuffers.Builder,
        offset: flatbuffers.Offset
    ): {};
    create(
        builder: flatbuffers.Builder,
        messageOffset: flatbuffers.Offset
    ): flatbuffers.Offset;
}

interface NewContract<D, R> {
    decode: (raw: R) => Promise<D>;
    encode: (data: D) => Promise<R>;
}

interface IValidationContract<Dto> {
    validate: (data: any) => Promise<Dto>;
}

interface FlatBufCodec<Dto extends object> {
    decode: (buf: flatbuffers.ByteBuffer) => Dto;
    encode: (builder: flatbuffers.Builder, data: Dto) => number;
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
    static create<Dto extends object>(
        codec: FlatBufCodec<Dto>,
        Dto: ClassType<Dto>
    ) {
        return new NContract(
            new TransportContract(codec),
            new ValidationContract(Dto)
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
        public success: NContract<RqDto>,
        public error: NContract<ErRsDto>
    ) {}
}

export class ErrorResponseCodec implements FlatBufCodec<ErrRsDto> {
    constructor(
        private readonly Response: any,
        private readonly ErrorResponse: typeof FBRPC.ErrorResponse,
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
        return NContractCreator.create(
            new ErrorResponseCodec(response, errorResponse, body),
            ErrRsDto
        );
    }
}

export class ResponseContractCreator {
    static create<RsDto extends object>(
        successResponseContract: NContract<RsDto>,
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

export class ContractCreator {
    static create<
        RqDto extends object,
        RsDto extends object,
        GResponse extends FBSInstance
    >(
        eventName: string,
        requestContract: NContract<RqDto>,
        successResponseContract: NContract<RsDto>,
        Response: GResponse,
        Body: any,
        ErrorResponse: any,
        SuccessResponse: any
    ) {
        return new Contract<RqDto, RsDto, GResponse>(
            eventName,
            requestContract,
            ResponseContractCreator.create(
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
    RqDto extends object,
    RsDto extends object,
    GResponse extends ClassType<FBSResponse>
> {
    constructor(
        public eventName: string,
        public requestContract: NContract<RqDto>,
        public responseContract: ResponseContract<RsDto>,
        public Response: GResponse,
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

    decodeErrorResponse(raw: Uint8Array): Promise<ErrRsDto> {
        return this.responseContract.error.decode(raw);
    }
    async decodeSuccessResponse(raw: Uint8Array): Promise<RsDto> {
        return await this.responseContract.success.decode(raw);
    }

    async decodeResponse(buf: Uint8Array): Promise<RsDto> {
        const byteBuilder = new flatbuffers.ByteBuffer(buf);
        const data = this.Response.getRoot(byteBuilder);
        const bodyType = data.bodyType();
        if (bodyType === this.Body.ErrorResponse) {
            const errorBody = await this.decodeErrorResponse(buf);
            throw new Error(errorBody.message);
        }
        return await this.decodeSuccessResponse(buf);
    }
}

export class ContractService {
    static async call<RqDto extends object, RsDto extends object>(
        contract: Contract<RqDto, RsDto>,
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
    static handler<RqDto extends object, RsDto extends object>(
        contract: Contract<RsDto, RqDto>
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
