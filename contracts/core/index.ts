import { flatbuffers } from "flatbuffers";
import { ClassType, transformAndValidate } from "class-transformer-validator";
import { IsString } from "class-validator";
import { RPC } from "../../rpc";

export abstract class SubContract<D extends object = any> {
    abstract Dto: ClassType<D>;
    /**
     * @abstract
     * @param {flatbuffers.ByteBuffer} buf
     * @return {*}  {*} Должен вернуть инстанс от сгенерированного fb кода, как это описать непонятно так как иерархии там нет
     * @memberof Contract
     */
    abstract decodeFB(buf: flatbuffers.ByteBuffer): D;
    abstract encodeFB(builder: flatbuffers.Builder, data: D): number;
    private async validate(data: D): Promise<D> {
        return await transformAndValidate(this.Dto, data);
    }
    async decode(buf: Uint8Array) {
        const b = new flatbuffers.ByteBuffer(buf);
        const data = this.decodeFB(b);
        return this.validate(data);
    }

    async encode(data: D): Promise<Uint8Array> {
        const pl = await this.validate(data);
        const builder = new flatbuffers.Builder();
        const offset = this.encodeFB(builder, pl);
        builder.finish(offset);
        return builder.asUint8Array();
    }
}

class ErrorResponseDto {
    @IsString()
    message!: string;
}

export abstract class ResponseContract {
    abstract success: SubContract;
    abstract error: SubContract;
}

export class ErrorResponseContract extends SubContract<ErrorResponseDto> {
    Dto = ErrorResponseDto;

    constructor(
        public Response: any,
        public ErrorResponse: any,
        public Body: any
    ) {
        super();
    }

    decodeFB(buf: flatbuffers.ByteBuffer) {
        const data = this.Response.getRoot(buf);
        const body = data.body(this.ErrorResponse())!;
        return {
            message: body.message()!,
        };
    }

    encodeFB(builder: flatbuffers.Builder, data: ErrorResponseDto): number {
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

export class Contract {
    constructor(
        public eventName: string,
        public requestContract: SubContract,
        public responseContract: ResponseContract,
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
    static async call(contract: Contract, data: any) {
        const payload = await contract.encodeRequest(data);
        const response = await RPC.call(contract.eventName, payload);
        return contract.decodeResponse(response);
    }
    static handler(contract: Contract, contractHandler: (...a: any) => any) {
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
    static handler(
        contract: Contract
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
