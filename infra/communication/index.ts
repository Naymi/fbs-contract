import {
    Contract,
    ErrRsDto,
    ResponseContractCreator,
} from "../../contracts/core";
import { ResponseContract } from "./response";

export class CommunicationContractCreator {
    static create<RqDto extends object, RsDto extends object>(
        eventName: string,
        requestContract: Contract<RqDto>,
        successResponseContract: Contract<RsDto>,
        Response: any,
        Body: any,
        ErrorResponse: any
    ) {
        return new CommunicationContract<RqDto, RsDto>(
            eventName,
            requestContract,
            ResponseContractCreator.create(
                successResponseContract,
                Response,
                ErrorResponse,
                Body
            ),
            Response,
            Body
        );
    }
}

export class CommunicationContract<RqDto extends object, RsDto extends object> {
    constructor(
        public eventName: string,
        public requestContract: Contract<RqDto>,
        public responseContract: ResponseContract<RsDto>,
        public Response: any,
        public Body: any
    ) {}

    encodeRequest(data: RqDto): Promise<Uint8Array> {
        return this.requestContract.encode(data);
    }

    decodeRequest(buf: Uint8Array): Promise<RqDto> {
        return this.requestContract.decode(buf);
    }

    encodeErrorResponse(data: ErrRsDto): Promise<Uint8Array> {
        return this.responseContract.error.encode(data);
    }
    encodeSuccessResponse(data: RsDto): Promise<Uint8Array> {
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

export type CommunicationContractResponse<
    C extends CommunicationContract<any, any>
> = ReturnType<C["decodeResponse"]>;
export type CommunicationContractRequest<
    C extends CommunicationContract<any, any>
> = Parameters<C["encodeRequest"]>[0];
