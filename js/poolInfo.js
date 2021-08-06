async function getCurrentGasPrices() {

    var response = await axios.get('https://ethgasstation.info/json/ethgasAPI.json')
    var prices = {
      low: response.data.safeLow / 10,
      medium: response.data.average / 10,
      high: response.data.fast / 10
    }
  
    var log_str = '***** gas price information *****'
    console.log(log_str.green);
    var log_str = 'High: ' + prices.high + '        medium: ' + prices.medium + '        low: ' + prices.low;
    console.log(log_str);
  
    return prices;
  }
  
  async function isPending(transactionHash) {
      return await web3.eth.getTransactionReceipt(transactionHash) == null;
  }
  
  async function updatePoolInfo() {
  
      var reserves = await pool_info.contract.methods.getReserves().call();
  
      if(pool_info.forward) {
          var eth_balance = reserves[0];
          var token_balance = reserves[1];
      } else {
          var eth_balance = reserves[1];
          var token_balance = reserves[0];
      }
  
      pool_info.input_volumn = eth_balance;
      pool_info.output_volumn = token_balance;
      pool_info.attack_volumn = eth_balance * (pool_info.attack_level/100);
  }
  
  async function getPoolInfo(input_token_address, out_token_address, level){
  
      var log_str = '*****\t' + input_token_info.symbol + '-' + out_token_info.symbol + ' Pair Pool Info\t*****'
      console.log(log_str.green);
  
      var pool_address = await uniswapFactory.methods.getPair(input_token_address, out_token_address).call();
      if(pool_address == '0x0000000000000000000000000000000000000000')
      {
          log_str = 'Uniswap has no ' + out_token_info.symbol + '-' + input_token_info.symbol + ' pair';
          console.log(log_str.yellow);
          return false;
      }   
  
      var log_str = 'Address:\t' + pool_address;
      console.log(log_str.white);
  
      var pool_contract = new web3.eth.Contract(UNISWAP_POOL_ABI, pool_address);
      var reserves = await pool_contract.methods.getReserves().call();
  
      var token0_address = await pool_contract.methods.token0().call();
  
      if(token0_address == INPUT_TOKEN_ADDRESS) {
          var forward = true;
          var eth_balance = reserves[0];
          var token_balance = reserves[1];
      } else {
          var forward = false;
          var eth_balance = reserves[1];
          var token_balance = reserves[0];
      }
  
      var log_str = (eth_balance/(10**input_token_info.decimals)).toFixed(5) + '\t' + input_token_info.symbol;
      console.log(log_str.white);
  
      var log_str = (token_balance/(10**out_token_info.decimals)).toFixed(5) + '\t' + out_token_info.symbol;
      console.log(log_str.white);
  
      var attack_amount = eth_balance * (level/100);
      pool_info = {'contract': pool_contract, 'forward': forward, 'input_volumn': eth_balance, 'output_volumn': token_balance, 'attack_level': level, 'attack_volumn': attack_amount}
      
      return true;
  }
  
  async function getEthInfo(user_wallet, address){
      var balance = await web3.eth.getBalance(user_wallet.address);
      var decimals = 18;
      var symbol = 'ETH';
  
      return {'address': WETH_TOKEN_ADDRESS, 'balance': balance, 'symbol': symbol, 'decimals': decimals, 'abi': null, 'token_contract': null}
  }

  async function getTokenInfo(tokenAddr, token_abi_ask, user_wallet) {
    //get token abi
    var response = await axios.get(token_abi_ask);
    if(response.data.status==0)
    {
        console.log('Invalid Token Address !')   
        return null;
    }   

    var token_abi = response.data.result;

    //get token info
    var token_contract = new web3.eth.Contract(JSON.parse(token_abi), tokenAddr);
    
    var balance = await token_contract.methods.balanceOf(user_wallet.address).call();
    var decimals = await token_contract.methods.decimals().call();
    var symbol =  await token_contract.methods.symbol().call();

    return {'address': tokenAddr, 'balance': balance, 'symbol': symbol, 'decimals': decimals, 'abi': token_abi, 'token_contract': token_contract}
}
