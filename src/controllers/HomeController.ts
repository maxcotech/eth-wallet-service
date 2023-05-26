import { Request, Response } from "express";
import AppService from "../services/AppService";
import Controller from "./Controller";
import { VAULT_ADDRESS } from "../config/settings";
import TransactionService from "../services/TransactionService";
import AppDataSource from "../config/dataSource";
import Contract from "../entities/Contract";

class HomeController extends Controller {
    public static async index(req: Request, res: Response){
        const {address} = req.query ?? {};
        const appService = new AppService();
        const repo = AppDataSource.getRepository(Contract);
        const txnService = new TransactionService();
        const contractId = (await repo.findOneBy({contractAddress: address as string}))?.id ?? null;
        res.send({
            hello: "Ethereum Vault",
            info: {
                latestBlock: await appService.getLatestBlockNum(),
                consolidatedBlock: await appService.getLastIndexedNumber(),
                vaultAddress: VAULT_ADDRESS,
                received: await txnService.getWalletAccountInfo(contractId)
                
            },
            baseUrl: req.baseUrl,
          
        })
    }

    
}

export default HomeController;