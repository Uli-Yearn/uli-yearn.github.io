import { useEffect, useState } from 'react'
import {metaMask, hooks} from "../connectors/metamask.js";

const {useAccounts, useProvider, useChainId, useIsActive} = hooks;

function shortAddr(addr) {
  return addr.substring(0,6) + "..." + addr.substring(addr.length - 4);
}

const AURORA_CHAIN_PARAM = {
  chainId: 1313161554,
  chainName: "Aurora Mainnet",
  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: ["https://mainnet.aurora.dev"],
  blockExplorerUrls: ["https://explorer.mainnet.aurora.dev/"],
}

function ConnectBtn() {
  const accounts = useAccounts();
  const isActive = useIsActive();
  const provider = useProvider();
  const chainId = useChainId();

  const activate = () => {
    metaMask.activate(AURORA_CHAIN_PARAM);
  }

  const renderContent = () => {
    if (isActive && chainId === AURORA_CHAIN_PARAM.chainId) {
      return <div className="">{shortAddr(accounts[0])}</div>
    } else {
      return <div className="cursor-pointer" onClick={() => {activate()}}>{isActive ? "Wrong Network" : "Connect Wallet"}</div>
    }
  }
  return (
    <div className="bg-neutral-900 rounded-md px-3 py-1 inline-flex place-items-center font-bold text-gray-50">
      {renderContent()}
    </div>
  )
}

export default ConnectBtn;