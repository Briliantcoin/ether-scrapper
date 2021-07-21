# This is a sample Python script.

# Press Shift+F10 to execute it or replace it with your code.
# Press Double Shift to search everywhere for classes, files, tool windows, actions, and settings.
import bs4
import requests
from bs4 import BeautifulSoup as soup
import redis
import asyncio
import re

TXHASH = "txhash"
NOUCE = "nouce"
METHOD = "method"
LAST_SEEN = "last_seen"
GAS_LIMIT = "gas_limit"
GAS_PRICE = "gas_price"

COLUMNS = {
    TXHASH: 0,
    NOUCE: 1,
    METHOD: 2,
    LAST_SEEN: 3,
    GAS_LIMIT: 4,
    GAS_PRICE: 5
}

NETWORK = "mainnet"
PROJECT_ID = '75ab6c9da83d44979791ac90964c144c'
HTTP_PROVIDER_LINK = f'https://{NETWORK}.infura.io/v3/{PROJECT_ID}'
publisher = redis.Redis(host='localhost', port=6379)
REDIS_CHANNEL = 'test'


def publish_address(message):
    publisher.publish(REDIS_CHANNEL, message)


def execute(name):
    # Use a breakpoint in the code line below to debug your script.
    my_url = 'https://etherscan.io/txsPending?a=0x7a250d5630b4cf539739df2c5dacb4c659f2488d&&m=hf&p=1'
    headers = {
        'User-Agent': 'PostmanRuntime/7.26.8',
        'Host': 'etherscan.io',
        'Accept': '*/*',
        'Cache-Control': 'no-cache',
        'Accept-Encoding': 'gzip, deflate, br'
    }

    # opening url and grabbing the web page
    client = requests.get(my_url, headers=headers)

    page_soup = soup(client.text, 'html.parser')
    container = page_soup.find('div', {'id': 'transfers'})
    tbody = container.find('table', {'class': 'table'}).tbody
    transaction_holders = tbody.findAll('tr')
    for row in transaction_holders:
        items = row.findAll('td')
        tx_hash = items[COLUMNS[TXHASH]].getText()
        nouce = items[COLUMNS[NOUCE]].getText()
        method = items[COLUMNS[METHOD]].getText()
        last_seen = items[COLUMNS[LAST_SEEN]].getText()
        gas_limit = items[COLUMNS[GAS_LIMIT]].getText()
        gas_price = items[COLUMNS[GAS_PRICE]].getText()

        number = re.findall(r'\d+', last_seen)
        if len(number) > 0 and number[0] < 30 and 'sec' in last_seen:
            message = {'tx_hash': tx_hash}
            publish_address(message)

# Press the green button in the gutter to run the script.
if __name__ == '__main__':
    execute('hello world')

# See PyCharm help at https://www.jetbrains.com/help/pycharm/
