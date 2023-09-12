import { Request, Response } from "express";
import AppService from "../services/AppService";
import Controller from "./Controller";
import { DECIMAL_PLACES, VAULT_ADDRESS } from "../config/settings";
import TransactionService from "../services/TransactionService";
import AppDataSource from "../config/dataSource";
import Contract from "../entities/Contract";
import WalletServices from "../services/WalletServices";
import { ethers } from "ethers";
import { HttpRequestParams } from "../dataTypes/Http";

class HomeController extends Controller {
    public static async index(req: Request, res: Response) {
        const { address } = req.query ?? {};
        const appService = new AppService();
        const repo = AppDataSource.getRepository(Contract);
        const txnService = new TransactionService();
        const contractId = (await repo.findOneBy({ contractAddress: address as string }))?.id ?? null;
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

    public static async walletBalance({ req, res }: HttpRequestParams) {
        const { contract, address } = req.query;
        const walletService = new WalletServices();
        const contractRepo = AppDataSource.getRepository(Contract);
        const contractData = await (async () => {
            if (!!contract === false) return null;
            return await contractRepo.findOne({ where: { contractAddress: contract as string } });
        })();
        const balanceInWei = (!!contractData?.id) ? await walletService.fetchTokenBalance((address as string) ?? VAULT_ADDRESS, contractData?.id) : await walletService.fetchCoinBalance((address as string) ?? VAULT_ADDRESS)
        const balance = ethers.utils.formatUnits(balanceInWei, contractData?.decimalPlaces ?? DECIMAL_PLACES)
        return {
            balance,
            vault_address: VAULT_ADDRESS
        }
    }


}

export default HomeController;