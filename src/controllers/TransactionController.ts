import Controller from './Controller';
import TransactionService from '../services/TransactionService';
import { HttpRequestParams } from './../dataTypes/Http';
import { VAULT_ADDRESS } from '../config/settings';
import AppDataSource from '../config/dataSource';
import Contract from '../entities/Contract';


export default class TransactionController extends Controller{
    

    public static async createTransaction({req, res}: HttpRequestParams){
        try{
            const {toAddress, contractAddress, amount, fromAddress} = req.body ?? {};
            const txnService = new TransactionService();
            const contractRepo = AppDataSource.getRepository(Contract);
            const contract = (contractAddress)? await contractRepo.findOneBy({contractAddress}): null;
            const sentTxn = await txnService.sendTransferTransaction(
                amount, 
                fromAddress ?? VAULT_ADDRESS,
                toAddress,
                contract?.id ?? undefined
            )
            if(sentTxn){
                return {
                    txnId: sentTxn,
                    amount,
                    address: toAddress
                }
            } else {
                throw new Error('An Error Occurred')
            }
           

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