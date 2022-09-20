import CryptoJs  from 'crypto-js';
import { config } from 'dotenv';

config();

export const encryptValue = (str: string) => {
    const cypherParams = CryptoJs.AES.encrypt(str,process.env.ENCRYPTION_SALT ?? "")
    return cypherParams.toString();
}

export const decryptValue = (val: string) => {
    const cypherParams = CryptoJs.AES.decrypt(val,process.env.ENCRYPTION_SALT ?? "");
    const decrypted = cypherParams.toString(CryptoJs.enc.Utf8);
    return decrypted;

}