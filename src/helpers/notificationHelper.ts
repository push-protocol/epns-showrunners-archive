
import epnsNotify from '../helpers/epnsNotifyHelper';
import config from '../config';
import { ethers } from 'ethers';

function getEPNSInteractableContract(web3network: String, channelKey: String) {
    // Get Contract
    return epnsNotify.getInteractableContracts(
        web3network,                                              // Network for which the interactable contract is req
        {                                                                       // API Keys
        etherscanAPI: config.etherscanAPI,
        infuraAPI: config.infuraAPI,
        alchemyAPI: config.alchemyAPI
        },
        channelKey,            // Private Key of the Wallet sending Notification
        config.deployedContract,                                                // The contract address which is going to be used
        config.deployedContractABI                                              // The contract abi which is going to be useds
    );
}

export default class NotificationHelper {
    // private channelKey;
    // private web3network;
    private epns;
    constructor(web3network: String, channelKey: String) {
        // this.channelKey = channelKey;
        // this.web3network = web3network;
        this.epns = getEPNSInteractableContract(web3network, channelKey);
    }

    /**
     * Get Subscribed Users
     * @description gets users subscribed to a channel
     * @param channelKey 
     * @returns 
     */
    async getSubscribedUsers (channelKey: string) {
        const channelAddress = ethers.utils.computeAddress(channelKey);
        const channelInfo = await this.epns.contract.channels(channelAddress)
        const filter = this.epns.contract.filters.Subscribe(channelAddress)
        let startBlock = channelInfo.channelStartBlock.toNumber();

        //Function to get all the addresses in the channel
        const eventLog = await this.epns.contract.queryFilter(filter, startBlock)
        const users = eventLog.map(log => log.args.user)
        return users
    }

    /**
     * Send Notification
     * @description Sends notification to a particular user
     * @param channelKey Channel Private key
     * @param user User Address
     * @param title Title of Notification
     * @param message Message of Notification
     * @param payloadTitle Internal Title
     * @param payloadMsg Internal Message
     */
    public async sendNotification (user: string, title: string, message: string, payloadTitle: string, payloadMsg: string) {
        const hash = await this.getPayloadHash(user, title, message, payloadTitle, payloadMsg)
        // Send notification
        const ipfshash = hash.ipfshash;
        const payloadType = hash.payloadType;

        const storageType = 1; // IPFS Storage Type
        const txConfirmWait = 1; // Wait for 0 tx confirmation

        const tx = await epnsNotify.sendNotification(
            this.epns.signingContract,                                      // Contract connected to signing wallet
            user,                                                           // Recipient to which the payload should be sent
            payloadType,                                                    // Notification Type
            storageType,                                                    // Notificattion Storage Type
            ipfshash,                                                       // Notification Storage Pointer
            txConfirmWait,                                                  // Should wait for transaction confirmation
            null,
            null                                                            // Logger instance (or console.log) to pass
        )
        return tx
    }

    /**
     * Get Payload Hash
     * @description Gets IPFS payload hash after upload
     * @param user User Address
     * @param title Title of Notification
     * @param message Message of Notification
     * @param payloadTitle Internal Title
     * @param payloadMsg Internal Message 
     * @returns 
     */
    async getPayloadHash (user: string, title: string, message: string, payloadTitle: string, payloadMsg: string) {
        const payload = await this.getLiquidityPayload(title, message, payloadTitle, payloadMsg)
        const ipfshash = await epnsNotify.uploadToIPFS(payload, null, null)
        // Sign the transaction and send it to chain
        return {
            success: true,
            user,
            ipfshash,
            payloadType: parseInt(payload.data.type)
        };
    }

    /**
     * Get Liquidity Payload
     * @description Gets IPFS payload hash after upload
     * @param title Title of Notification
     * @param message Message of Notification
     * @param payloadTitle Internal Title
     * @param payloadMsg Internal Message
     * @returns 
     */
    async getLiquidityPayload (title: string, message: string, payloadTitle: string, payloadMsg: string) {
        return epnsNotify.preparePayload(
            null,                                                               // Recipient Address | Useful for encryption
            3,                                                                  // Type of Notification
            title,                                                              // Title of Notification
            message,                                                            // Message of Notification
            payloadTitle,                                                       // Internal Title
            payloadMsg,                                                         // Internal Message
            null,                                                               // Internal Call to Action Link
            null,                                                               // internal img of youtube link
        );
    }
}