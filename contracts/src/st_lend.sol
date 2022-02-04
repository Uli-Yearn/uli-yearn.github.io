// pragma solidity ^0.8.2;
// pragma experimental ABIEncoderV2;

// import "./vault_base.sol";

// interface CToken is IERC20 {
//     function mint(uint256 mintAmount) external returns (uint256);

//     function redeem(uint256 redeemTokens) external returns (uint256);

//     function underlying() external view returns (address);

//     function redeemUnderlying(uint256 redeemAmount) external returns (uint256);

//     function borrow(uint256 borrowAmount) external returns (uint256);

//     function repayBorrow(uint256 repayAmount) external returns (uint256);

//     function balanceOfUnderlying(address owner) external returns (uint256);

//     function getAccountSnapshot(address account)
//         external
//         view
//         returns (
//             uint256,
//             uint256,
//             uint256,
//             uint256
//         );
// }

// interface CETH {
//     function mint() external payable;

//     function redeem(uint256 redeemTokens) external returns (uint256);

//     function redeemUnderlying(uint256 redeemAmount) external returns (uint256);

//     function borrow(uint256 borrowAmount) external returns (uint256);

//     function repayBorrow(uint256 repayAmount) external returns (uint256);

//     function getAccountSnapshot(address account)
//         external
//         view
//         returns (
//             uint256,
//             uint256,
//             uint256,
//             uint256
//         );
// }

// interface IUnitroller {
//     function claimComp(address holder, address[] calldata cTokens) external;
// }

// contract LendingStrategy is StrategyBase {
//     using SafeERC20 for IERC20;
//     using Address for address;
//     using SafeMath for uint256;

//     address public constant comptrl =
//         0xb74633f2022452f377403B638167b0A135DB096d;
//     address public RewardToken = 0xE36FFD17B2661EB57144cEaEf942D95295E637F0; // filda

//     address public ctoken;

//     constructor (address _vault, address _ctoken) StrategyBase(_vault) {
//         ctoken = _ctoken;
//         if (want != WHT) {
//             require(CToken(ctoken).underlying() == want, "mismatch");
//         }
//         IERC20(RewardToken).safeApprove(mdexRouter, 0);
//         IERC20(RewardToken).safeApprove(mdexRouter, type(uint256).max);

//         IERC20(want).safeApprove(ctoken, 0);
//         IERC20(want).safeApprove(ctoken, type(uint256).max);
//     }


//     function deposit() public override {
//         uint256 _want = IERC20(want).balanceOf(address(this));
//         if (_want > 0) {
//             if (want == WHT) {
//                 IWETH(WHT).withdraw(_want);
//                 uint balance = address(this).balance;
//                 if (balance > 0) {
//                     CETH(ctoken).mint{value: balance}();
//                 }
//             } else {
//                 require(CToken(ctoken).mint(_want) == 0, "deposit fail");
//             }
//         }
//     }


//     function _withdrawSome(uint256 _amount) internal override {
//         uint maxAmt = CToken(ctoken).balanceOfUnderlying(address(this));
//         if (_amount >= maxAmt) {
//             _amount = maxAmt;
//         }
//         if (address(want) == WHT) {
//             require(CETH(ctoken).redeemUnderlying(_amount) == 0, "redeem fail");
//             uint balance = address(this).balance;
//             if (balance > 0) {
//                 IWETH(address(want)).deposit{value: balance}();
//             }
//         } else {
//             require(CToken(ctoken).redeemUnderlying(_amount) == 0, "redeem fail");
//         }
//     }

//     function harvest() public harvestWrapper {
//         address[] memory markets = new address[](1);
//         markets[0] = ctoken;
//         IUnitroller(comptrl).claimComp(address(this), markets);
//         uint256 rewardAmt = IERC20(RewardToken).balanceOf(address(this));

//         if (rewardAmt == 0) {
//             return;
//         }

//         address[] memory path = new address[](2);
//         path[0] = RewardToken;
//         path[1] = WHT;
        
//         Uni(mdexRouter).swapExactTokensForTokens(
//             rewardAmt,
//             uint256(0),
//             path,
//             address(this),
//             block.timestamp.add(1800)
//         );
//     }

//     function balanceOfPool() public override view returns (uint256) {
//         (, uint256 cTokenBal, , uint256 exchangeRate) =
//             CToken(ctoken).getAccountSnapshot(address(this));
//         return cTokenBal.mul(exchangeRate).div(1e18);
//     }
// }
