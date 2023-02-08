import { ethers } from 'ethers';
import { Response } from 'express';
import { Request } from 'express';
import TransactionService from '../services/TransactionService';

class Controller {
    public static successWithData(res: Response,data: any, message: string = "successful"){
        res.json({
            success: true,
            message,
            data
        })
    }

    static async testRun(req: Request, res: Response){
        try{
            const service = new TransactionService();
            const result = await service.provider.getTransaction("0x416805985aeefbeccc386bdacf88d1e8153fcb3c159129dec4b9ee3da3a8efbe");
            res.json({result, convertedVal: parseFloat(ethers.utils.formatEther(result.value))});
        }
        catch(e){
            if(e instanceof Error) console.log(e.message, e.stack);

        }
    }
}

export default Controller;