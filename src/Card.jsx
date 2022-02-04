import {useState, useEffect} from "react";
import { Tab } from '@headlessui/react'
import {ethers} from "ethers"

import { toast } from 'react-toastify';

import { formatFixed, parseFixed } from '@ethersproject/bignumber'

import {metaMask, hooks} from "./connectors/metamask.js";

const {useAccounts, useProvider, useChainId, useIsActive} = hooks;

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

const toastConfig = {
  position: "top-right",
  autoClose: 2000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: false,
  progress: undefined,
}

const tabs = ["Deposit", "Withdraw"]

const erc20ABI = [
  "function totalSupply() view returns (uint)",
  "function decimals() view returns (uint8)",
  "function allowance(address, address) view returns (uint)",
  "function approve(address, uint) returns (bool)",
  "function balanceOf(address) view returns (uint)",
]

const vaultABI = [
  "function pricePerShare() view returns (uint)",
  "function tick() view returns (tuple(uint, uint, uint, uint))",
  "function totalSupply() view returns (uint)",
  "function totalBalance() view returns (uint)",
  "function decimals() view returns (uint)",
  "function balanceOf(address) view returns (uint)",
  "function want() view returns (address)",
  "function deposit(uint)",
  "function withdraw(uint)",
]

const uniV2PairAbi = [
  'function name() view returns (string memory)',
  'function symbol() view returns (string memory)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint)',
  'function balanceOf(address owner) view returns (uint)',
  'function allowance(address owner, address spender) view returns (uint)',

  'function factory() view returns (address)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function price0CumulativeLast() view returns (uint)',
  'function price1CumulativeLast() view returns (uint)',
];

const uniV2RouterAbi = new ethers.utils.Interface([
  'function getAmountsOut(uint, address[] memory) view returns (uint[] memory)',
]);

const TEN = ethers.BigNumber.from(10); 
const E18 = ethers.BigNumber.from('1000000000000000000'); // 1e18

const calLpUsdValue = async (lpAmts, provider, lpAddr, quotaToken, quotaTokenUsdPath, router) => {
  let lpContract = new ethers.Contract(lpAddr, uniV2PairAbi, provider);
  let quotaContract = new ethers.Contract(quotaToken, erc20ABI, provider); 
  let totalValue = (await quotaContract.balanceOf(lpAddr)).mul(2);
  let totalSupply = await lpContract.totalSupply();
  if (quotaTokenUsdPath) {
    let routerContract = new ethers.Contract(router, uniV2RouterAbi, provider);
    let usdContract = new ethers.Contract(quotaTokenUsdPath[quotaTokenUsdPath.length - 1], erc20ABI, provider);
    let quotaDecimals = await quotaContract.decimals()
    let usdDecimals = await usdContract.decimals();
    let amts = await routerContract.getAmountsOut(parseFixed("1", quotaDecimals), quotaTokenUsdPath)
    let amt = amts[amts.length - 1]
    return lpAmts.map((lpAmt) => {
      return formatFixed(totalValue.mul(lpAmt).div(totalSupply).mul(amt).div(TEN.pow(quotaDecimals)), usdDecimals);
    })
  } else {
    let usdDecimals = await quotaContract.decimals();
    return lpAmts.map((lpAmt) => {
      return formatFixed(totalValue.mul(lpAmt).div(totalSupply), usdDecimals);
    })
  }
}

const SECONDS_PER_DAY = 24 * 60 * 60;

const calApy = (val) => {
  let t0Share = val[0];
  let t0Timestamp = val[1].toNumber();
  let t1Share = val[2];
  let t1Timestamp = val[3].toNumber();

  console.log(t0Share.toString(), t0Timestamp, t1Share.toString(), t1Timestamp);

  if (t0Timestamp === t1Timestamp) {
    return 0;
  }
  let placeholder = ethers.BigNumber.from(1000000);
  let tsDelta = t1Timestamp - t0Timestamp;
  let shareDelta = t1Share.mul(placeholder).div(t0Share).sub(placeholder).mul(SECONDS_PER_DAY * 365).div(tsDelta).div(E18);
  let apy = shareDelta.toNumber() * 100 / placeholder.toNumber(); 
  console.log(apy);
  return apy;
}

function useVault(addr) {
  const accounts = useAccounts();
  const provider = useProvider();
  const [refresh, setRefresh] = useState(1);
  const [tvl, setTvl] = useState(undefined);
  const [apy, setApy] = useState(undefined);
  const [userDeposited, setUserDeposited] = useState(undefined);
  const [decimals, setDecimals] = useState(undefined);
  const [want, setWant] = useState(undefined);
  const [userWantBalance, setUserWantBalance] = useState(undefined);
  const [enoughAllowance, setEnoughAllowance] = useState(false);

  useEffect(() => {
    let run = async () => {
      if (provider && accounts && accounts.length) {
        let c = new ethers.Contract(addr, vaultABI, provider); 
        setApy(calApy(await c.tick()));
        setDecimals(await c.decimals())
        let want = await c.want();
        setWant(want);
        let _userDeposited = await c.balanceOf(accounts[0])
        let usdValues = await calLpUsdValue([await c.totalBalance(), _userDeposited], provider, want, "0xB12BFcA5A55806AaF64E99521918A4bf0fC40802", null, null)
        // let usdValues = await calLpUsdValue([await c.totalBalance(), _userDeposited], provider, want, "0xC42C30aC6Cc15faC9bD938618BcaA1a1FaE8501d", ["0xC42C30aC6Cc15faC9bD938618BcaA1a1FaE8501d", "0xB12BFcA5A55806AaF64E99521918A4bf0fC40802"], "0xa3a1eF5Ae6561572023363862e238aFA84C72ef5")
        setTvl(usdValues);
        setUserDeposited(_userDeposited);
        let wantContract = new ethers.Contract(want, erc20ABI, provider); 
        let _bal = await wantContract.balanceOf(accounts[0])
        setUserWantBalance(_bal);
        let _allowance = await wantContract.allowance(accounts[0], addr);
        setEnoughAllowance(_allowance.gte(_bal) && _allowance.gt(ethers.constants.Zero));
      }
    }
    run();
  }, [provider, accounts, refresh]);

  let approve = async () => {
    if (provider && accounts && accounts.length && want) {
      let wantContract = new ethers.Contract(want, erc20ABI, provider).connect(provider.getSigner()); 
      let tx = await wantContract.approve(addr, ethers.constants.MaxUint256);
      toast("Transaction Pending" , toastConfig);
      let receipt = await provider.waitForTransaction(tx.hash)
      if (receipt.status === 1) {
        toast("Transaction Success" , toastConfig);
      }
      setTimeout(() => {
        setRefresh((new Date()).getTime());
      }, 5000)
    }
  }

  let deposit = async (amt) => {
    if (provider && accounts && accounts.length) {
      let vaultContract = new ethers.Contract(addr, vaultABI, provider).connect(provider.getSigner()); 
      let tx = await vaultContract.deposit(parseFixed(amt, decimals));
      toast("Transaction Pending" , toastConfig);
      let receipt = await provider.waitForTransaction(tx.hash)
      console.log(receipt)
      if (receipt.status === 1) {
        toast("Transaction Success" , toastConfig);
      }
      setTimeout(() => {
        setRefresh((new Date()).getTime());
      }, 5000)
    }
  }

  let withdraw = async (amt) => {
    if (provider && accounts && accounts.length) {
      let vaultContract = new ethers.Contract(addr, vaultABI, provider).connect(provider.getSigner()); 
      let tx = await vaultContract.withdraw(parseFixed(amt, decimals));
      toast("Transaction Pending" , toastConfig);
      let receipt = await provider.waitForTransaction(tx.hash)
      console.log(receipt)
      if (receipt.status === 1) {
        toast("Transaction Success" , toastConfig);
      }
      setTimeout(() => {
        setRefresh((new Date()).getTime());
      }, 5000)
    }
  }

  return [tvl, apy, userDeposited, decimals, want, userWantBalance, enoughAllowance, approve, deposit, withdraw];
}

function Card({config}) {
  let [depositBalance, setDepositBalance] = useState("0");
  let [withdrawBalance, setWithdrawBalance] = useState("0");
  let vaultAddr = "0x77C3E85c0c3D39E230DB1D5cb923df6FF4A1edC8"
  const [tvl, apy, userDeposited, decimals, want, userWantBalance, enoughAllowance, approve, deposit, withdraw] = useVault(vaultAddr);

  return (
      <div className="rounded-md bg-slate-900 px-4 pt-2 text-gray-50 flex flex-col justify-between space-y-8 pb-8">
        <div className="flex justify-between items-center flex-none">
          <div className="grow">
            <div className="text-lg font-bold">{config.title}</div>
            <div className="inline px-1 text-sm font-bold bg-purple-700">{config.platform}</div>
          </div>
          <div className="flex-none flex justify-end items-center">
          {
            config.icons.map((url) => {
              return <img className="w-7 h-7" src={url} key={url}/>
            })
          }
          </div>
        </div>
        <div className="grid grid-cols-3 w-full">
          <div className="flex flex-col items-center">
            <div>TVL($)</div> 
            <div>{tvl ? tvl[0] : "-"}</div>
          </div>
          <div className="flex flex-col items-center">
            <div>APY</div> 
            <div>{apy + "%"}</div>
          </div>
          <div className="flex flex-col items-center">
            <div>Your Balance($)</div> 
            <div>{tvl ? tvl[1] : "-"}</div>
          </div>
        </div>
        <div>
        <Tab.Group>
          <Tab.List className="flex space-x-1 bg-blue-900/20">
            {tabs.map((category) => (
              <Tab
                key={category}
                className={({ selected }) =>
                  classNames(
                    'w-full py-1.5 text-sm leading-5 font-medium text-blue-700 rounded-md',
                    'focus:outline-none focus:ring-1 ring-offset-1 ring-offset-blue-400 ring-white ring-opacity-60',
                    selected
                      ? 'bg-gray-200 shadow'
                      : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                  )
                }
              >
                {category}
              </Tab>
            ))}
          </Tab.List>
          <Tab.Panels className="mt-2">
            <Tab.Panel
              className={classNames(
                'focus:outline-none ring-white ring-opacity-60'
              )}
            >
            <div className="flex text-xs mb-1 mt-2">
              <div>Balance:</div> 
              <div className="pl-2 underline cursor-pointer decoration-dashed" onClick={() => {setDepositBalance(formatFixed(userWantBalance, decimals))}}>{userWantBalance ? formatFixed(userWantBalance, decimals) : "-"}</div>
            </div>
            <div className="flex justify-between space-x-4">
              <input value={depositBalance} onChange={(evt) => setDepositBalance(evt.target.value)} className="grow shadow appearance-none border rounded-md py-1 px-1 text-gray-50 leading-tight bg-white/[0.12]" id="username" type="text" />
              {
                enoughAllowance ?
                <div className="inline-flex justify-center items-center bg-yellow-900 rounded-md px-4 font-bold cursor-pointer" onClick={() => {deposit(depositBalance)}}>Deposit</div>
                : <div className="inline-flex justify-center items-center bg-yellow-900 rounded-md px-4 font-bold cursor-pointer" onClick={() => {approve()}}>Approve</div>
              }
            </div>
            </Tab.Panel>
            <Tab.Panel
              className={classNames(
                'focus:outline-none ring-white ring-opacity-60'
              )}
            >
            <div className="flex text-xs mb-1 mt-2">
              <div>Balance:</div> 
              <div onClick={() => {setWithdrawBalance(formatFixed(userDeposited, decimals))}}className="pl-2 underline cursor-pointer decoration-dashed">{userDeposited ? formatFixed(userDeposited, decimals) : "-"}</div>
            </div>
            <div className="flex justify-between space-x-4">
              <input value={withdrawBalance} onChange={(evt) => {setWithdrawBalance(evt.target.value)}} className="grow shadow appearance-none border rounded-md py-1 px-1 text-gray-50 leading-tight bg-white/[0.12]" id="username" type="text"/>
              <div onClick={() => {withdraw(withdrawBalance)}} className="inline-flex justify-center items-center bg-yellow-900 rounded-md px-4 font-bold cursor-pointer">Withdraw</div>
            </div>
            </Tab.Panel>
          </Tab.Panels>
      </Tab.Group>
      </div>
      </div>
  )
}

export default Card;