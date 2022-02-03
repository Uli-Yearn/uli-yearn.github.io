import {metaMask, hooks} from "../connectors/metamask.js";

const {useAccounts, useProvider, useChainId, useIsActive} = hooks;

function shortAddr(addr) {
  return addr.substring(0,6) + "..." + addr.substring(addr.length - 4);
}

function ConnectBtn() {
  const accounts = useAccounts();
  const isActive = useIsActive()

  const activate = () => {
    metaMask.activate();
  }

  const renderContent = () => {
    if (isActive) {
      return <div className="">{shortAddr(accounts[0])}</div>
    } else {
      return <div className="cursor-pointer" onClick={() => {activate()}}>Connect Wallet</div>
    }
  }
  return (
    <div className="bg-neutral-900 rounded-md px-3 py-1 inline-flex justify-center items-center font-bold text-gray-50">
      {renderContent()}
    </div>
  )
}

export default ConnectBtn;