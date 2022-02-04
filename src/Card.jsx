import {useState, useEffect} from "react";
import { Tab } from '@headlessui/react'
import {ethers} from "ethers"

import { formatFixed, parseFixed } from '@ethersproject/bignumber'

import {metaMask, hooks} from "./connectors/metamask.js";

const {useAccounts, useProvider, useChainId, useIsActive} = hooks;

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
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
  "function totalSupply() view returns (uint)",
  "function totalBalance() view returns (uint)",
  "function decimals() view returns (uint)",
  "function balanceOf(address) view returns (uint)",
  "function want() view returns (address)",
  "function deposit(uint)",
  "function withdraw(uint)",
]

function useVault(addr) {
  const accounts = useAccounts();
  const provider = useProvider();
  const [refresh, setRefresh] = useState(1);
  const [totalBalance, setTotalBalance] = useState(undefined);
  const [userDeposited, setUserDeposited] = useState(undefined);
  const [decimals, setDecimals] = useState(undefined);
  const [want, setWant] = useState(undefined);
  const [userWantBalance, setUserWantBalance] = useState(undefined);
  const [enoughAllowance, setEnoughAllowance] = useState(false);

  useEffect(() => {
    let run = async () => {
      if (provider && accounts && accounts.length) {
        let c = new ethers.Contract(addr, vaultABI, provider); 
        setTotalBalance(await c.totalBalance())
        setUserDeposited(await c.balanceOf(accounts[0]))
        setDecimals(await c.decimals())
        let want = await c.want();
        setWant(want);
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
      await provider.waitForTransaction(tx.hash)
      setRefresh((new Date()).getTime());
      setTimeout(() => {
        setRefresh((new Date()).getTime());
      }, 2000)
    }
  }

  let deposit = async (amt) => {
    if (provider && accounts && accounts.length) {
      let vaultContract = new ethers.Contract(addr, vaultABI, provider).connect(provider.getSigner()); 
      let tx = await vaultContract.deposit(parseFixed(amt, decimals));
      let receipt = await provider.waitForTransaction(tx.hash)
      setTimeout(() => {
        setRefresh((new Date()).getTime());
      }, 2000)
    }
  }

  let withdraw = async (amt) => {
    if (provider && accounts && accounts.length) {
      let vaultContract = new ethers.Contract(addr, vaultABI, provider).connect(provider.getSigner()); 
      let tx = await vaultContract.withdraw(parseFixed(amt, decimals));
      let receipt = await provider.waitForTransaction(tx.hash)
      setTimeout(() => {
        setRefresh((new Date()).getTime());
      }, 2000)
    }
  }

  return [totalBalance, userDeposited, decimals, want, userWantBalance, enoughAllowance, approve, deposit, withdraw];
}

function Card({config}) {
  let [depositBalance, setDepositBalance] = useState("0");
  let [withdrawBalance, setWithdrawBalance] = useState("0");
  let vaultAddr = "0x2C30380006c89AD45f17F68C1584271091499622"
  const [vaultWantBalance, userDeposited, decimals, want, userWantBalance, enoughAllowance, approve, deposit, withdraw] = useVault(vaultAddr);

  return (
      <div className="rounded-md bg-slate-900 px-4 pt-2 text-gray-50 flex flex-col justify-between space-y-8 pb-6">
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
            <div>{vaultWantBalance ? parseInt(formatFixed(vaultWantBalance, decimals)) : "-"}</div>
          </div>
          <div className="flex flex-col items-center">
            <div>APY</div> 
            <div>15%</div>
          </div>
          <div className="flex flex-col items-center">
            <div>Your Balance</div> 
            <div>{userDeposited ? formatFixed(userDeposited, decimals) : "-"}</div>
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