import Controller from './Controller';
import TransactionService from '../services/TransactionService';
import WalletServices from './../services/WalletServices';
import { HttpRequestParams } from './../dataTypes/Http';
import { VAULT_ADDRESS } from '../config/settings';


export default class TransactionController extends Controller{
    

    public static async createTransaction({req, res}: HttpRequestParams){
        try{
            const {toAddress, contractAddress, amount, fromAddress} = req.body ?? {};
            const txnService = new TransactionService();
            const walletService = new WalletServices();
            const vaultAddress = VAULT_ADDRESS ?? "";
            const vaultWallet = await walletService.fetchWalletFromAddress(vaultAddress);
            const proposedGasPrice = (await txnService.getGasFeePayload())?.ProposeGasPrice
            const txnRequest = await vaultWallet?.populateTransaction({
                to: vaultAddress,
                gasLimit: txnService.getGasLimit(),
                gasPrice: proposedGasPrice,
                nonce: await vaultWallet.getTransactionCount()
            })
            console.log("Proposed Gas Price......", proposedGasPrice);
            console.log("Created Transaction.............",txnRequest,vaultWallet,"this is vaultadd "+ vaultAddress);
            Controller.successWithData(res,await vaultWallet?.getFeeData());

        } catch(e){
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