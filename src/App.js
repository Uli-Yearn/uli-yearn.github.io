import { useEffect, useState } from 'react'
import {ethers} from "ethers"
import navLogo from "./logo.png"

import {metaMask, hooks} from "./connectors/metamask.js";
import ConnectBtn from "./widgets/ConnectBtn.jsx";
import Card from "./Card.jsx";

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const {useAccounts, useProvider, useChainId, useIsActive} = hooks;



const cards = [
  {
    title: "AURORA/USDC",
    platform: "WannaSwap",
    vaultAddr: "0x77C3E85c0c3D39E230DB1D5cb923df6FF4A1edC8",
    wantSource: "https://wannaswap.finance/exchange/add/0xB12BFcA5A55806AaF64E99521918A4bf0fC40802/0xC42C30aC6Cc15faC9bD938618BcaA1a1FaE8501d",
    icons: [
      "https://wannaswap.finance/_next/image?url=%2Ficon.png&w=96&q=50",
      "https://wannaswap.finance/_next/image?url=https%3A%2F%2Fraw.githubusercontent.com%2Fwannaswap%2Ftokens%2Fmaster%2Fblockchains%2Faurora%2Fassets%2F0xB12BFcA5A55806AaF64E99521918A4bf0fC40802%2Flogo.png&w=96&q=50"
    ]
  },
]

function App() {
  return (
    <div>
    <div className="px-4 md:px-6 bg-slate-700 min-h-screen pt-2 pb-10">
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
    <ToastContainer />
    </div>
  );
}

export default App;
