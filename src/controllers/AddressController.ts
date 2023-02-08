import Controller from './Controller';
import WalletServices from '../services/WalletServices';
import AppDataSource from './../config/dataSource';
import { ethers } from 'ethers';
import { encryptValue } from './../helpers/object_helpers';
import Wallet from '../entities/Wallet';
import { HttpRequestParams } from './../dataTypes/Http';
import { ENCRYPTION_PASSPHRASE } from '../config/settings';

export default class AddressController extends Controller {
    public static async createAddress({req, res}: HttpRequestParams){
        const walletRepo = AppDataSource.getRepository(Wallet);
        const walletService = new WalletServices();
        const wallet = walletService.createNewWallet();
        const address = (await wallet.getAddress()).toLowerCase();
        const encWallet = await wallet.encrypt(ethers.utils.toUtf8Bytes(ENCRYPTION_PASSPHRASE ?? ""));
        const encrypted = encryptValue(encWallet);
        const newWalletModel = new Wallet();
        newWalletModel.address = address;
        newWalletModel.userId = req.body.userId ?? null;
        newWalletModel.walletCrypt = encrypted;
        await walletRepo.save(newWalletModel);
        return {address,userId: req.body.userId}
    }
}
