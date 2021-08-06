const NETWORK = "mainnet";
const PROJECT_ID = '299bf20331c949699954e339bf66d086';//"833633b85ef64effa9d0e47fb2857b32"; //"8b4dac9803324fbbb31ce9c58b972810";//75ab6c9da83d44979791ac90964c144c";//
const {UNISWAP_ROUTER_ABI, UNISWAP_POOL_ABI, UNISWAP_ROUTER_ADDRESS, UNISWAP_FACTORY_ABI, UNISWAP_FACTORY_ADDRESS} = require('./constants.js');

const WEBSOCKET_PROVIDER_LINK = `wss://${NETWORK}.infura.io/ws/v3/${PROJECT_ID}`;
const HTTP_PROVIDER_LINK = `https://${NETWORK}.infura.io/v3/${PROJECT_ID}`;

var Web3 = require('web3');
var abiDecoder = require('abi-decoder');

var redis = require("redis");
const { default: axios } = require('axios');
var web3 = new Web3(new Web3.providers.WebsocketProvider(WEBSOCKET_PROVIDER_LINK));
var web3http = new Web3(new Web3.providers.HttpProvider(HTTP_PROVIDER_LINK));
var uniswapRouter = new web3.eth.Contract(UNISWAP_ROUTER_ABI, UNISWAP_ROUTER_ADDRESS);
var uniswapFactory = new web3.eth.Contract(UNISWAP_FACTORY_ABI, UNISWAP_FACTORY_ADDRESS);
ETH_TOKEN_ADDRESS = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"; 
USDT_TOKEN_ADDRESS = "0xdac17f958d2ee523a2206206994597c13d831ec7";

abiDecoder.addABI(UNISWAP_ROUTER_ABI);

const account = '0x7a250d5630b4cf539739df2c5dacb4c659f2488d'.toLowerCase();

var count = 0;
var transactionHash = '0xad7eb45137dc67a851f061c24d13e385d872ae62d0debb28286d203b6b97141c';

function parseTx(input) {
    if (input == '0x')
        return ['0x', []]
    let decodedData = abiDecoder.decodeMethod(input);
    let method = decodedData['name'];
    let params = decodedData['params'];

    return [method, params]
}

async function decode_transaction(txhash) {
    try {
        let transaction = await web3.eth.getTransaction(txhash);
        console.log(transaction)
        data = parseTx(transaction.input)
        console.log(data[0])
        console.log('=====================================\n');
        console.log(data[1])
    } catch (error) {

        console.log('Unknown Handled Error');
        console.log(error);
        process.exit();
    }
}

/**
 * 
const subscription = web3.eth.subscribe('pendingTransactions', (err, res) => {
    if (err) console.error(err);
});
subscription.on('data', (txHash) => {
    setTimeout(async () => {
        try {
            count += 1;
            console.log('Count: ',count);
            console.log('Transaction Hash: ',txHash);
            let tx = await web3.eth.getTransaction(txHash);
            if (tx && tx.to) {// This is the point you might be looking for to filter the address
                if (tx.to.toLowerCase() === account) {
                    console.log('Transaction Hash: ',txHash );
                    console.log('Transaction Confirmation Index: ',tx.transactionIndex );// 0 when transaction is pending
                    console.log('Transaction Received from: ',tx.from );
                    console.log('Transaction Amount(in Ether): ',web3.utils.fromWei(tx.value, 'ether'));
                    console.log('Transaction Receiving Date/Time: ',new Date());
                    console.log('=====================================\n');
                }
            }
        } catch (err) {
            console.error(err);
        }
    }, 10 * 1000); // runs every 20 seconds
});
 */

function redisSubcribe(){
    var subscriber = redis.createClient();
    var channel = "test";
    subscriber.subscribe(channel);
    subscriber.on("message", function (channel, message) {
        console.log(message);
        console.log('=====================================\n');
    });
}

async function sampleConverter(){
    try {
        ETH_AMOUNT = 0.1;
        amount = ETH_AMOUNT;
        var input_token_data = await getTokenData(ETH_TOKEN_ADDRESS);
        var out_token_data = await getTokenData(USDT_TOKEN_ADDRESS);
        var pool_address = await uniswapFactory.methods.getPair(ETH_TOKEN_ADDRESS, USDT_TOKEN_ADDRESS).call();
        var pool_contract = new web3.eth.Contract(UNISWAP_POOL_ABI, pool_address);
        var reserves = await pool_contract.methods.getReserves().call();
        var token0_address = await pool_contract.methods.token0().call();
        var token1_address = await pool_contract.methods.token1().call();

        console.log('reserve object: ',reserves);
        console.log('Token 0 address: ',token0_address);
        console.log('Token 1 address: ',token1_address);
        var pool_info = {
            'contract': pool_contract,
            'input_volumn': reserves[0], 
            'output_volumn': reserves[1]
        }
        console.log('Transaction Receiving Date/Time: ',new Date());
        console.log('input amount: ',pool_info.input_volumn.toString());
        console.log('output amount: ',pool_info.output_volumn.toString());
        var outamountToken = await uniswapRouter.methods.getAmountOut((amount * (10 ** input_token_data.decimals)).toString(), 
                                        pool_info.input_volumn.toString(), pool_info.output_volumn.toString()).call();
        console.log('IN_Amount '.yellow, amount + ' ' + input_token_data.symbol);
        console.log('OUT_Amount '.yellow, (outamountToken/(10**out_token_data.decimals)).toFixed(3) + ' ' + out_token_data.symbol);
    } catch(error) {
        console.log('Unknown Handled Error');
        console.log(error);
        process.exit();
    }
}

async function getTokenData(tokenAddress){
    var token_abi_ask = 'https://api.etherscan.io/api?module=contract&action=getabi&address='+ tokenAddress + '&apikey=33Y681VVRYXX7J2XCRX3CYYUSWPQ6EPQ9K';

    var response = await axios.get(token_abi_ask);
    if (response.data.status == 0) {
        console.log("invalid token address");
        return null;
    }

    var token_abi = response.data.result;
    var token_contract = new web3.eth.Contract(JSON.parse(token_abi), tokenAddress);
    var decimals = await token_contract.methods.decimals().call();
    var symbol =  await token_contract.methods.symbol().call();
    return {'address': tokenAddress, 'decimals': decimals, 'symbol': symbol, 'token_constract': token_contract}
}
//decode_transaction("0xb7be11fc9ad794097ad2d4a4eec24b17f7c89742c0d48ca28bcba50ab7d0bca3")
//sampleConverter()

async function convertAmount(inputAmount, inputTokenInfo, outputTokenInfo){
    var poolPair = await uniswapFactory.methods.getPair(inputTokenInfo.address, outputTokenInfo.address).call();
    var poolContract = new web3.eth.Contract(UNISWAP_POOL_ABI, poolPair);
    var reserves = await poolContract.methods.getReserves().call();
    var pool_info = {
        'contract': poolContract,
        'input_volumn': reserves[0], 
        'output_volumn': reserves[1]
    }

    console.log('input reserve amount: ',pool_info.input_volumn.toString());
    console.log('output reserve amount: ',pool_info.output_volumn.toString());
    var out_amount_token = await uniswapRouter.methods.getAmountOut((inputAmount * (10 ** inputTokenInfo.decimals)).toString(), 
                                        pool_info.input_volumn.toString(), pool_info.output_volumn.toString()).call();
    console.log('In Amount ', inputAmount + ' ' + inputTokenInfo.symbol);
    console.log('Out Amount ', (out_amount_token/(10 ** outputTokenInfo.decimals)).toFixed(3) + ' ' + outputTokenInfo.symbol);
    return out_amount_token;
}

var buy_amount = 0.5;
var inputTokenInfo;
var outputTokenInfo; 

async function main() {
    inputTokenInfo = await getTokenData(ETH_TOKEN_ADDRESS);
    outputTokenInfo = await getTokenData(USDT_TOKEN_ADDRESS);
    convertAmount(buy_amount, inputTokenInfo, outputTokenInfo);
}
main();