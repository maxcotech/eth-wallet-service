import { ethers } from 'ethers';
import { Response } from 'express';
import { Request } from 'express';
import { VAULT_ADDRESS } from '../config/settings';
import TransactionService from '../services/TransactionService';
import WalletServices from '../services/WalletServices';

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
            // const result = await service.provider.getTransaction("0x416805985aeefbeccc386bdacf88d1e8153fcb3c159129dec4b9ee3da3a8efbe");
            // res.json({result, convertedVal: parseFloat(ethers.utils.formatEther(result.value))});
            // const result = ethers.utils.formatEther(await service.fetchFeeEstimate(VAULT_ADDRESS,true) as ethers.BigNumberish)
            const transaction = await service.createTokenTransfer(1,"0xc8f9ee7b99090ff50a2523e69c24583b9dfef889",VAULT_ADDRESS,6,true)
            res.json({transaction});
        }
        catch(e){
            if(e instanceof Error) console.log(e.message, e.stack);
            res.json({error:e})
        }
    }
}

export default Controller;