import Service from './Service';
import { ethers, utils } from 'ethers';
import WalletServices from './WalletServices';
import { Repository } from 'typeorm';
import ReceivedTransaction from '../entities/ReceivedTransaction';
import AppDataSource from '../config/dataSource';
import Wallet from '../entities/Wallet';
import { DECIMAL_PLACES, EIP_TYPE, VAULT_ADDRESS } from '../config/settings';
import ValidationException from '../exceptions/ValidationException';
import { transactionErrors } from '../config/errors/transaction.errors';
import { walletErrors } from '../config/errors/wallet.errors';
import SentTransaction from '../entities/SentTransaction';
import { formatEther, parseEther, parseUnits } from 'ethers/lib/utils';

export default class TransactionService extends Service {
    vaultTxnInterval: number;
    receivedTxnRepo: Repository<ReceivedTransaction>;
    walletRepo: Repository<Wallet>;
    sentTxnRepo: Repository<SentTransaction>;

    constructor() {
        super();
        this.vaultTxnInterval = 1000 * 60 * 5;
        this.receivedTxnRepo = AppDataSource.getRepository(ReceivedTransaction);
        this.walletRepo = AppDataSource.getRepository(Wallet);
        this.sentTxnRepo = AppDataSource.getRepository(SentTransaction);
    }
    async sendCoinToVault(fromAddress: string, amount: string, privateKey: any = null) {
        const vaultAddr = VAULT_ADDRESS;
        const walletServices = new WalletServices();
        const wallet = (privateKey === null || privateKey === undefined) ? await walletServices.fetchWalletFromAddress(fromAddress) : walletServices.createWalletFromPrivateKey(privateKey);
        if (wallet !== null) {
            const txnRequest = await wallet.populateTransaction({
                to: vaultAddr,
                value: ethers.utils.parseUnits(amount)
            });
            console.log(txnRequest);

        }
    }

    async saveReceivedTransaction(toAddress: string, sentToVault: boolean, txHash: string, amount: any, contractId?: number | null) {
        if (await this.receivedTxnRepo.findOneBy({ txHash }) !== null) {
            console.log('transaction ', txHash, ' already processed');
            return null;
        } else {
            const receivedTxn = new ReceivedTransaction();
            receivedTxn.address = toAddress;
            receivedTxn.sentToVault = sentToVault;
            receivedTxn.txHash = txHash;
            receivedTxn.value = amount;
            receivedTxn.contractId = contractId ?? undefined;
            return await this.receivedTxnRepo.save(receivedTxn);
        }
    }

    getGasLimit(contractTransaction = false) {
        return (contractTransaction) ? 250000 : 21000;
    }


    getFeeDifference(amount: number, gasPriceNum: number, decimal: number | null) {
        const gasLimitNum = this.getGasLimit();
        const totalFee = gasLimitNum * gasPriceNum;
        return amount - parseFloat(ethers.utils.formatUnits(totalFee, decimal ?? DECIMAL_PLACES));
    }

    async createTransferTransaction(amountInput?: number, fromAddress?: string, recipientAddress?: string, contractId?: number, acceptBelowAmount: boolean = false) {
        console.log('creating transfer transaction of ', amountInput);
        const toAddress = (!!recipientAddress) ? recipientAddress : VAULT_ADDRESS;
        const senderAddress = fromAddress ?? VAULT_ADDRESS;
        let transactionObj: ethers.providers.TransactionRequest | null | undefined = null;
        if (!!contractId) {
            transactionObj = await this.createTokenTransfer(contractId, senderAddress, toAddress, amountInput, acceptBelowAmount);
        } else {
            transactionObj = await this.createCoinTransfer(senderAddress, toAddress, amountInput, acceptBelowAmount);
        }
        console.log('txn obj..............................', transactionObj);
        return transactionObj;
    }

    async fetchFeeEstimate(from: string, contractTransaction: boolean = false, amount = "0.0000001") {
        const walletService = new WalletServices();
        const wallet = await walletService.fetchWalletFromAddress(from);
        //const feeData = await wallet?.getFeeData();
        //return feeData?.maxFeePerGas?.mul(ethers.utils.parseUnits(this.getGasLimit(contractTransaction).toString(), "wei"));
        const gasUnits = await this.provider.estimateGas({});
        const gasPrice = await this.provider.getGasPrice();
        return gasPrice.mul(parseUnits(gasUnits.toString(), "wei"));

    }

    async createCoinTransfer(senderAddress: any, toAddress: any, amountInput?: number, acceptBelowAmount: boolean = false) {
        const walletService = new WalletServices();
        const balance = await walletService.fetchCoinBalance(senderAddress);
        const balanceInEther = ethers.utils.formatEther(balance);
        const amount = (!!amountInput) ? ethers.utils.parseEther(amountInput.toString()) : balance;
        const fromWallet = await walletService.fetchWalletFromAddress(senderAddress);
        let transactionObj = await fromWallet?.populateTransaction({
            type: EIP_TYPE,
            to: toAddress,
            from: senderAddress,
            gasLimit: utils.parseUnits(this.getGasLimit(false).toString(), 'wei')
        });
        console.log('creating coin txn in coin trf func', {
            balance, balanceInEther, amount, amountInput
        });
        if (transactionObj) {
            if (balance.lt(amount)) {
                if (acceptBelowAmount) {
                    transactionObj.value = balance;
                } else {
                    throw new Error(walletErrors.insufficientBalance);
                }
            } else {
                transactionObj.value = amount;
            }
        }
        if (toAddress == VAULT_ADDRESS && transactionObj) {
            //substract transaction fee from transaction value;
            transactionObj.value = (transactionObj.value as ethers.BigNumber).sub((transactionObj.maxFeePerGas as ethers.BigNumber).mul((transactionObj.gasLimit as ethers.BigNumber)))
            console.log('final value in ether to transfer is now ', ethers.utils.formatEther(transactionObj.value));
        }
        return transactionObj;
    }




    async createTokenTransfer(contractId: number, senderAddress: any, toAddress: any, amountInput?: number, acceptBelowAmount: boolean = false) {
        try {
            const contract = await this.getContract(contractId);
            let transactionObj: ethers.providers.TransactionRequest | null | undefined = null;
            const walletService = new WalletServices();
            const balance = await walletService.fetchTokenBalance(senderAddress, contract.id);
            const amount = (!!amountInput) ? ethers.utils.parseUnits(amountInput.toString(), contract.decimalPlaces) : balance;
            const coinBalance = await walletService.fetchCoinBalance(senderAddress);
            const feeEstimate = await this.fetchFeeEstimate(senderAddress, true);
            console.log('fee estimate', feeEstimate);
            if (coinBalance.lt(feeEstimate as ethers.BigNumber)) {
                console.log('Coin Balance is ', ethers.utils.formatEther(coinBalance));
                console.log('Fee Estimate is', ethers.utils.formatEther(feeEstimate as ethers.BigNumberish));
                throw new ValidationException(transactionErrors.insufficientFee);
            }
            if (balance.lt(amount)) {
                console.log('insufficient balance improvising')
                if (acceptBelowAmount) {
                    transactionObj = await this.triggerSmartContract(contract.id, senderAddress, toAddress, balance)
                } else {
                    throw new ValidationException(walletErrors.insufficientBalance);
                }
            } else {
                console.log('sufficient balance creating transaction')
                transactionObj = await this.triggerSmartContract(contract.id, senderAddress, toAddress, amount)
            }
            console.log(transactionObj);
            return transactionObj;
        }
        catch (e) {
            console.log('Failed to create transaction', (e instanceof Error) ? e.message + " " + e.stack : "")
        }

    }

    async triggerSmartContract(contractId: number, senderAddress: string, toAddress: string, amount: ethers.BigNumber) {
        const walletService = new WalletServices();
        const fromWallet = await walletService.fetchWalletFromAddress(senderAddress, true);
        if (fromWallet) {
            const contractApi = await this.getContractApi(contractId, fromWallet);
            const data = contractApi.interface.encodeFunctionData("transfer", [
                toAddress,
                ethers.utils.parseUnits(amount.toString(), "wei"),
            ]);
            const txnReq = await fromWallet.populateTransaction({
                data,
                type: EIP_TYPE ?? 1,
                to: contractApi.address,
                gasLimit: ethers.utils.parseUnits(this.getGasLimit(true).toString(), "wei"),
                nonce: await this.provider.getTransactionCount(await fromWallet.getAddress())
            })
            return txnReq;
        }

    }

    getDefaultAbi() {
        return JSON.stringify([
            "function name() public view returns (string)",
            "function symbol() public view returns (string)",
            "function decimals() public view returns (uint8)",
            "function totalSupply() public view returns (uint256)",
            "function balanceOf(address _owner) public view returns (uint256 balance)",
            "function transfer(address _to, uint256 _value) public returns (bool success)",
            "function transferFrom(address _from, address _to, uint256 _value) public returns (bool success)",
            "function approve(address _spender, uint256 _value) public returns (bool success)",
            "function allowance(address _owner, address _spender) public view returns (uint256 remaining)",
            "event Transfer(address indexed _from, address indexed _to, uint256 _value)",
            "event Approval(address indexed _owner, address indexed _spender, uint256 _value)"
        ])
    }

    async getContractApi(contractId: number, signer?: ethers.Signer) {
        const contract = await this.getContract(contractId);
        const contractApi = new ethers.Contract(
            contract.contractAddress, contract.contractAbi ?? this.getDefaultAbi(), signer ?? this.provider
        );
        return contractApi;
    }

    async getWalletAccountInfo(contractId: null | number) {
        let query = this.receivedTxnRepo.createQueryBuilder('received_transactions')
        query = query.select('sentToVault')
            .addSelect('SUM(CAST(value AS float))', 'totalBalance');
        if (!!contractId === false) {
            query = query.where('contractId IS NULL')
        } else {
            query = query.where('contractId = :contract', { contract: contractId })
        }
        const result = await query.groupBy("sentToVault")
            .getRawMany();
        return result;
    }



    async sendTransferTransaction(amountInput?: number, fromAddress?: string, recipientAddress?: string, contractId?: number, acceptBelowAmount: boolean = false) {
        try {
            const transaction = await this.createTransferTransaction(amountInput, fromAddress, recipientAddress, contractId, acceptBelowAmount);
            if (!!transaction) {
                const walletServices = new WalletServices();
                const senderWallet = await walletServices.fetchWalletFromAddress(fromAddress ?? VAULT_ADDRESS);
                if (senderWallet) {
                    console.log('sending transaction....');
                    const sentTxn = await senderWallet?.sendTransaction(transaction);
                    console.log('sent txn', sentTxn);
                    const receipt = await sentTxn.wait();
                    console.log(`receipt `, receipt);
                    const sentTransaction = new SentTransaction();
                    sentTransaction.txId = sentTxn.hash;
                    await this.sentTxnRepo.save(sentTransaction);
                    return sentTxn.hash;
                }
            }
            return false;
        } catch (e) {
            console.log(e);
            return false;
        }
    }
}
