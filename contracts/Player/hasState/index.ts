import { flatbuffers } from "flatbuffers";
import { RPC as fb } from "./contract_generated";
import "reflect-metadata";
import { PlayerMethods } from "../playerMethods";
import { IsBoolean, IsEnum, IsIn, IsString } from "class-validator";
import { ClassType, transformAndValidate } from "class-transformer-validator";
class RequestDto {
    @IsIn(Object.values(fb.PlayerState))
    state!: fb.PlayerState;
}

abstract class ResponseContract {
    abstract success: SubContract;
    abstract error: SubContract;
}

abstract class Contract {
    abstract eventName: string;
    abstract requestContract: SubContract;
    abstract responseContract: ResponseContract;

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

    decodeSuccessResponse(data: any) {
        return this.responseContract.success.decode(data);
    }

    decodeResponse(buf: Uint8Array) {
        const byteBuilder = new flatbuffers.ByteBuffer(buf);
        const data = fb.Response.getRoot(byteBuilder);
        const bodyType = data.bodyType();
        if (bodyType === fb.Body.ErrorResponse) {
            const errorBody = data.body(new fb.ErrorResponse())!;
            throw new Error(errorBody.message()!);
        }
        const body = data.body(new fb.SuccessResponse())!;
        console.log("success: ", body);
        return {
            result: body.result(),
        };
    }
}

abstract class SubContract<D extends object = any> {
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

class PlayerHasStateRequestContract extends SubContract<RequestDto> {
    Dto = RequestDto;
    decodeFB(buf: flatbuffers.ByteBuffer) {
        const data = fb.Request.getRoot(buf);
        return {
            state: data.state(),
        };
    }

    encodeFB(builder: flatbuffers.Builder, data: RequestDto): number {
        return fb.Request.create(builder, data.state);
    }
}

class SuccessResponseDto {
    @IsBoolean()
    result!: boolean;
}

class ErrorResponseDto {
    @IsString()
    message!: string;
}

class SuccessResponseContract extends SubContract<SuccessResponseDto> {
    Dto = SuccessResponseDto;
    decodeFB(buf: flatbuffers.ByteBuffer) {
        const data = fb.Response.getRoot(buf);
        const body = data.body(new fb.SuccessResponse())!;
        return {
            result: body.result(),
        };
    }

    encodeFB(builder: flatbuffers.Builder, data: SuccessResponseDto): number {
        return fb.Response.create(
            builder,
            fb.Body.SuccessResponse,
            fb.SuccessResponse.create(builder, data.result)
        );
    }
}

class ErrorResponseContract extends SubContract<ErrorResponseDto> {
    Dto = ErrorResponseDto;
    decodeFB(buf: flatbuffers.ByteBuffer) {
        const data = fb.Response.getRoot(buf);
        const body = data.body(new fb.ErrorResponse())!;
        return {
            message: body.message()!,
        };
    }

    encodeFB(builder: flatbuffers.Builder, data: ErrorResponseDto): number {
        return fb.Response.create(
            builder,
            fb.Body.ErrorResponse,
            fb.ErrorResponse.create(builder, builder.createString(data.message))
        );
    }
}

class PlayerHasStateResponseContract extends ResponseContract {
    error = new ErrorResponseContract();
    success = new SuccessResponseContract();
}

class PlayerHasStateContract extends Contract {
    eventName = PlayerMethods.hasState;
    requestContract = new PlayerHasStateRequestContract();
    responseContract = new PlayerHasStateResponseContract();
}

class RPC {
    static handlers: { name: string; handler: (...a: any[]) => any }[] = [];
    static handler(name: string, handler: (...a: any[]) => any) {
        RPC.handlers.push({ name, handler });
    }
    static call(callName: string, data: any) {
        return RPC.handlers
            .find(({ name, handler }) => name === callName)
            ?.handler?.(data);
    }
}

const playerHasStateContract = new PlayerHasStateContract();

class RPCDecorator {
    static handler(
        contract: Contract
    ): (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) => void {
        return function (_, __, descriptor: PropertyDescriptor): void {
            RPC.handler(contract.eventName, async function (data: any) {
                const payload = await contract.decodeRequest(data);
                try {
                    const response = await descriptor.value(payload);
                    return contract.encodeSuccessResponse(response);
                } catch (error) {
                    return contract.encodeErrorResponse(error);
                }
            });
        };
    }
}

class ContractService {
    static async call(contract: Contract, data: any) {
        const payload = await contract.encodeRequest(data);
        let response;
        try {
            response = await RPC.call(contract.eventName, payload);
        } catch (error) {
            return contract.decodeErrorResponse(error);
        }
        console.log("RPC call: ", response);
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

class ContractServiceDecorator {
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

export class PlayerDispatcher {
    @ContractServiceDecorator.handler(playerHasStateContract)
    hasState(payload: RequestDto) {
        if (0) {
            throw new Error("hasState error");
        }
        return { result: true };
    }
}

export class PlayerController {
    static hasState(payload: any) {
        return ContractService.call(playerHasStateContract, payload);
    }
}
const m = async () => {
    try {
        const response = await PlayerController.hasState({ state: 1 });
        console.log("succes:", response);
    } catch (error) {
        console.error("failed:", error);
    }
};
m();
