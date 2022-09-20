import Controller from './Controller';
import { Request } from 'express';
import { Response } from 'express';
import WalletServices from '../services/WalletServices';
import AppDataSource from './../config/dataSource';
import { ethers } from 'ethers';
import { config } from 'dotenv';
import { encryptValue } from './../helpers/object_helpers';
import Wallet from '../entities/Wallet';

export default class AddressController extends Controller {
    public static async createAddress(req: Request, res: Response){
        try{
            config();
            const walletRepo = AppDataSource.getRepository(Wallet);
            const walletService = new WalletServices();
            const wallet = walletService.createNewWallet();
            const address = (await wallet.getAddress()).toLowerCase();
            const encWallet = await wallet.encrypt(ethers.utils.toUtf8Bytes(process.env.ENCRYPTION_PASSPHRASE ?? ""));
            const encrypted = encryptValue(encWallet);
            const newWalletModel = new Wallet();
            newWalletModel.address = address;
            newWalletModel.userId = req.body.userId ?? null;
            newWalletModel.walletCrypt = encrypted;
            await walletRepo.save(newWalletModel);
            Controller.successWithData(res,{address,userId: req.body.userId})
        }
        catch(e){
            let message = "Unknown error occurred";
            if(e instanceof Error){
                message = e.message;
            }
            res.status(500).json({
                message
            })
        }
       
    }
}
