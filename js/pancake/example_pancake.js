const Web3 = require('web3');
const abiDecoder = require('abi-decoder');
const colors = require("colors");
const Tx = require('ethereumjs-tx').Transaction;
const axios = require('axios');
const BigNumber = require('big-number');

const { PANCAKE_FACTORY_ABI, PANCAKE_POOL_ABI, PANCAKE_ROUTER_ADDRESS, PANCAKE_FACTORY_ADDRESS, NETWORK, HTTP_PROVIDER_LINK } = require('./constants.js');

const web3 = new Web3(new Web3.providers.HttpProvider(HTTP_PROVIDER_LINK));
const pancakeRouter = new web3.eth.Contract(PANCAKE_ROUTER_ABI, PANCAKE_ROUTER_ADDRESS);
const pancakeFactory = new web3.eth.Contract(PANCAKE_FACTORY_ABI, PANCAKE_FACTORY_ADDRESS);
abiDecoder.addABI(PANCAKE_ROUTER_ABI);

const INPUT_TOKEN_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const WBNB_TOKEN_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';


async function decode_transaction(txhash) {
    try {
        let transaction = await web3.eth.getTransaction(txhash);
        console.log(transaction)
        dataInput = parseTx(transaction.input)
        return [transaction, dataInput]
    } catch (error) {

        console.log('Unknown Handled Error');
        console.log(error);
        process.exit();
    }
}

async function decode_transaction_meta(transactionId) {
    const { transaction, transaction_data } = await decode_transaction(transactionId);
    var methodName = transaction_data[0];
    var transactionInput = transaction_data[1];

    var inputAddress = transactionInput[2].value[0];
    var outputAddress = transactionInput[2].value[1];
    var inputAmount = parseInt(transactionInput[0].value);
    var outputAmount = parseInt(transactionInput[1].value);
    var gasLimit = parseInt(transaction.gas);
    var gasPrice = parseInt(transaction.gasPrice);
    return {
        'inputAddress': inputAddress, 'outputAddress': outputAddress,
        'inputAmount': inputAmount, 'outputAmount': outputAmount, 'gasLimit': gasLimit, 'gasPrice': gasPrice, 'methodName': methodName
    };
}

async function getTokenABI(tokenAddress) {
    var token_abi_ask = `https://api.bscscan.com/api?module=contract&action=getabi&address=${tokenAddress}&apikey=TGUV5GCERZVD9RUP4A4GUQCQN83GM5Y96F`;

    var response = await axios.get(token_abi_ask);
    if (response.data.status == 0) {
        console.log("invalid token address");
        return null;
    }

    var token_abi = response.data.result;
    var token_contract = new web3.eth.Contract(JSON.parse(token_abi), tokenAddress);
    var decimals = await token_contract.methods.decimals().call();
    var symbol = await token_contract.methods.symbol().call();
    return { 'address': tokenAddress, 'decimals': decimals, 'symbol': symbol, 'token_constract': token_contract }
}

function convertTokenAmount(amount, tokenInfo) {
    var convertAmount = amount / (10 ** tokenInfo.decimals);
    return convertAmount
}

function redisSubcribe() {
    var subscriber = redis.createClient();
    var channel = "test";
    subscriber.subscribe(channel);
    subscriber.on("message", function (channel, message) {
        console.log(message);
        console.log('=====================================\n');
    });
}

async function execute() {
    try {
        tokenABI = await getTokenABI(USDT_TOKEN_ADDRESS);
        outputTokenInfo = await getTokenABI(ETH_TOKEN_ADDRESS);
        var poolPair = await pancakeFactory.methods.getPair(inputTokenInfo.address, outputTokenInfo.address).call();
        var poolContract = new web3.eth.Contract(UNISWAP_POOL_ABI, poolPair);

        var decode_data = decode_transaction(trasaction_id_1);
        var transaction = decode_data[0];
        var dataInput = decode_data[1];
        transactionMetadata = decode_transaction_meta(transaction, dataInput)
        convertInputAmount = convertTokenAmount(transactionMetadata.inputAmount, inputTokenInfo)
        convertOutputAmount = convertTokenAmount(transactionMetadata.outputAmount, outputTokenInfo)

        console.log('In Amount ', convertInputAmount.toFixed(5) + ' ' + outputTokenInfo.symbol);
        console.log('Out Amount ', convertOutputAmount.toFixed(5) + ' ' + outputTokenInfo.symbol)
    } catch (error) {
        console.log('Unknown Handled Error');
        console.log(error);
    }
}

async function sample_converter() {
    const inputAmount = 2700;
    var input_token_data = await getTokenABI(INPUT_TOKEN_ADDRESS);
    var out_token_data = await getTokenABI(WBNB_TOKEN_ADDRESS);

    console.log("input token data");
    console.log(input_token_data);
    console.log("output token data");
    console.log(out_token_data);
    const poolPair = await pancakeFactory.methods.getPair(input_token_data.address, out_token_data.address).call();
    const poolContract = new web3.eth.Contract(PANCAKE_POOL_ABI, poolPair);
    var reserves = await poolContract.methods.getReserves().call();
    var pool_info = {
        'contract': poolContract,
        'input_volumn': reserves[0], 
        'output_volumn': reserves[1]
    }

    var log_str = (pool_info.input_volumn/(10**input_token_data.decimals)).toFixed(5) + '\t' + input_token_data.symbol;
    console.log(log_str.white);

    var log_str = (pool_info.output_volumn/(10**out_token_data.decimals)).toFixed(5) + '\t' + out_token_data.symbol;
    console.log(log_str.white);

    const out_amount_token = await pancakeRouter.methods.getAmountOut(
        (inputAmount * (10 ** input_token_data.decimals)).toString(),
        pool_info.input_volumn.toString(), pool_info.output_volumn.toString()).call();
    
    const convert_out_amout = (out_amount_token / (10 ** out_token_data.decimals )).toFixed(5);
    const convert_str = `convert from ${inputAmount} of ${input_token_data.symbol} to ${convert_out_amout} of ${out_token_data.decimals}`;
    console.log(convert_str);
}

sample_converter();