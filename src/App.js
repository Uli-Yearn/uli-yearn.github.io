import { useEffect, useState } from 'react'
import {ethers} from "ethers"
import navLogo from "./logo.png"

import {metaMask, hooks} from "./connectors/metamask.js";
import ConnectBtn from "./widgets/ConnectBtn.jsx";
import Card from "./Card.jsx";

const {useAccounts, useProvider, useChainId, useIsActive} = hooks;



const cards = [
  {
    title: "AURORA/USDC",
    platform: "WannaSwap",
    icons: [
      "https://wannaswap.finance/_next/image?url=https%3A%2F%2Fraw.githubusercontent.com%2Fwannaswap%2Ftokens%2Fmaster%2Fblockchains%2Faurora%2Fassets%2F0xB12BFcA5A55806AaF64E99521918A4bf0fC40802%2Flogo.png&w=96&q=50"
    ]
  },
  // {
  //   title: "AURORA/USDC",
  //   platform: "WannaSwap",
  //   icons: [
  //     "https://wannaswap.finance/_next/image?url=%2Ficon.png&w=96&q=50",
  //     "https://wannaswap.finance/_next/image?url=https%3A%2F%2Fraw.githubusercontent.com%2Fwannaswap%2Ftokens%2Fmaster%2Fblockchains%2Faurora%2Fassets%2F0xB12BFcA5A55806AaF64E99521918A4bf0fC40802%2Flogo.png&w=96&q=50"
  //   ]
  // },
  // {
  //   title: "AURORA/USDC",
  //   platform: "WannaSwap",
  //   icons: [
  //     "https://wannaswap.finance/_next/image?url=%2Ficon.png&w=96&q=50",
  //     "https://wannaswap.finance/_next/image?url=https%3A%2F%2Fraw.githubusercontent.com%2Fwannaswap%2Ftokens%2Fmaster%2Fblockchains%2Faurora%2Fassets%2F0xB12BFcA5A55806AaF64E99521918A4bf0fC40802%2Flogo.png&w=96&q=50"
  //   ]
  // },
  // {
  //   title: "AURORA/USDC",
  //   platform: "WannaSwap",
  //   icons: [
  //     "https://wannaswap.finance/_next/image?url=%2Ficon.png&w=96&q=50",
  //     "https://wannaswap.finance/_next/image?url=https%3A%2F%2Fraw.githubusercontent.com%2Fwannaswap%2Ftokens%2Fmaster%2Fblockchains%2Faurora%2Fassets%2F0xB12BFcA5A55806AaF64E99521918A4bf0fC40802%2Flogo.png&w=96&q=50"
  //   ]
  // },
  // {
  //   title: "AURORA/USDC",
  //   platform: "WannaSwap",
  //   icons: [
  //     "https://wannaswap.finance/_next/image?url=%2Ficon.png&w=96&q=50",
  //     "https://wannaswap.finance/_next/image?url=https%3A%2F%2Fraw.githubusercontent.com%2Fwannaswap%2Ftokens%2Fmaster%2Fblockchains%2Faurora%2Fassets%2F0xB12BFcA5A55806AaF64E99521918A4bf0fC40802%2Flogo.png&w=96&q=50"
  //   ]
  // },
]

function App() {
  return (
    <div className="px-12 bg-slate-700 min-h-screen pt-2">
    <div className="header flex justify-between pr-1">
      <div className="inline-flex items-center">
        <img src={navLogo} className="h-11 pl-2"/>
        <div className="text-gray-50 font-bold ml-0.5 mt-1 text-lg flex items-center">ULIYEARN</div>
      </div>
      <ConnectBtn />
    </div>
    <div className="grid pt-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ">
      {
        cards.map((c, idx) => {
          return <Card config={c} key={idx}/>
        })
      }
    </div>
    </div>
  );
}

export default App;
