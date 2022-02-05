import getpass
import sys
import datetime
import time
from web3 import Web3


class Main(object):
    def __init__(self, private_key):
        self.strategy_abi = '[{"inputs":[{"internalType":"address","name":"_controller","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"FEE_DENOMINATOR","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"balanceOfPool","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"balanceOfWant","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"comp","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"controller","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"deposit","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"getName","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"governance","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"harvest","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"pool","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"poolId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_controller","type":"address"}],"name":"setController","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_governance","type":"address"}],"name":"setGovernance","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_strategist","type":"address"}],"name":"setStrategist","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_strategistReward","type":"uint256"}],"name":"setStrategistReward","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_withdrawalFee","type":"uint256"}],"name":"setWithdrawalFee","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"strategist","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"strategistReward","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"uniRouter","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"usdt","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"want","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"contract IERC20","name":"_asset","type":"address"}],"name":"withdraw","outputs":[{"internalType":"uint256","name":"balance","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"withdrawAll","outputs":[{"internalType":"uint256","name":"balance","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"withdrawalFee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}]'
        url = "https://mainnet.aurora.dev"
        self.chainId = 1313161554
        self.w3 = Web3(Web3.HTTPProvider(url, request_kwargs={"timeout": 3}))

        self.account = self.w3.eth.account.from_key(private_key)
        print("me:", self.account.address)

        self.infos = [
            [
                "wNear/Usdc[WannaSwap]",
                "0x978B7568a5A45c21f01D51b8acf92197ce9C6b5B",
            ],
        ]

    def harvest(self):
        nonce = self.w3.eth.getTransactionCount(self.account.address)
        gasprice = self.w3.eth.gas_price
        for name, st in self.infos:
            c = self.w3.eth.contract(address=st, abi=self.strategy_abi)
            try:
                gas = c.functions.harvest().estimateGas({
                    "from": self.account.address
                })
                gas = 1000000
                tx = c.functions.harvest().buildTransaction(
                    {
                        "gasPrice": gasprice,
                        "gas": int(gas * 1.5),
                        "chainId": self.chainId,
                        "nonce": nonce,
                    }
                )
                signed_tx = self.account.sign_transaction(tx)
                tx_hash = signed_tx.hash.hex()
                self.w3.eth.sendRawTransaction(signed_tx.rawTransaction)
                print(st, nonce, "harvest success, hash: ", tx_hash)
                time.sleep(1)
                nonce += 1
            except Exception as e:
                print(st, nonce, "fail, ", e)
                return

def run(k):
    m = Main(k)
    while True:
        try:
            print(datetime.datetime.now())
            m.harvest()
            time.sleep(2 * 24 * 60 * 60)
        except KeyboardInterrupt as e:
            break
        except Exception as e:
            print(e)
            time.sleep(20)


if __name__ == "__main__":
    k = getpass.getpass()
    run(k)

