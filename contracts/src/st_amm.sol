pragma solidity ^0.8.2;
pragma experimental ABIEncoderV2;

import "./vault_base.sol";

struct UserInfo {
    uint256 amount;     
    uint256 rewardDebt; 
}

struct PoolInfo {
    address lpToken;
    uint256 allocPoint;
    uint256 lastRewardBlock;  
    uint256 accMdxPerShare; 
    uint256 accMultLpPerShare; 
    address rewarder; 
}

interface IPool {
    function deposit(uint256 _pid, uint256 _amount, address _ref) external;
    function withdraw(uint256 _pid, uint256 _amount) external;
    function emergencyWithdraw(uint256 _pid) external;
    function userInfo(uint pid, address user) external view returns (UserInfo memory);
    function poolInfo(uint pid) external view returns (PoolInfo memory);
}

contract AmmLpStrategy is StrategyBase {
    using SafeERC20 for IERC20;
    using Address for address;
    using SafeMath for uint256;

    IPool public pool = IPool(0x2B2e72C232685fC4D350Eaa92f39f6f8AD2e1593);
    uint public poolId;

    address public ammRouter = 0xa3a1eF5Ae6561572023363862e238aFA84C72ef5;

    address public RewardToken = 0x7faA64Faf54750a2E3eE621166635fEAF406Ab22; 

    address[] public path0;
    address[] public path1;

    address public token0;
    address public token1;

    constructor (address _vault, uint _pid, 
        address[] memory _path0,
        address[] memory _path1) StrategyBase(_vault) {

        poolId = _pid;
        require(pool.poolInfo(_pid).lpToken == vault.want());

        path0 = _path0;
        path1 = _path1;

        if (_path0.length == 0) {
            token0 = RewardToken;
        } else {
            require(_path0[0] == RewardToken);
            token0 = _path0[_path0.length - 1];
        }
        if (_path1.length == 0) {
            token1 = RewardToken;
        } else {
            require(_path1[0] == RewardToken);
            token1 = _path1[_path1.length - 1];
        } 
        require(UniPair(want).token0() == token0 || UniPair(want).token0() == token1);
        require(UniPair(want).token1() == token0 || UniPair(want).token1() == token1);


        IERC20(RewardToken).safeApprove(ammRouter, 0);
        IERC20(RewardToken).safeApprove(ammRouter, type(uint256).max);

        IERC20(token0).safeApprove(ammRouter, 0);
        IERC20(token0).safeApprove(ammRouter, type(uint256).max);

        IERC20(token1).safeApprove(ammRouter, 0);
        IERC20(token1).safeApprove(ammRouter, type(uint256).max);

        IERC20(want).safeApprove(address(pool), 0);
        IERC20(want).safeApprove(address(pool), type(uint256).max);
    }

    function emergencyWithdrawAll() external onlyVault {
        pool.emergencyWithdraw(poolId);
        IERC20(want).safeTransfer(address(vault), balanceOfWant());
    }

    function _withdrawSome(uint256 _amount) internal {
        if (_amount > 0) {
            pool.withdraw(poolId, _amount);
        }
    }

    function withdraw(uint _amt) public onlyVault {
        _withdrawSome(_amt);
        IERC20(want).safeTransfer(address(vault), _amt);
    }

    function withdrawAll() public onlyVault {
        _withdrawSome(balanceOfPool());
        IERC20(want).safeTransfer(address(vault), balanceOfWant());
    }

    function deposit() public {
        uint bal = balanceOfWant();
        if (bal > 0) {
            pool.deposit(poolId, bal, config.governance());
        }
    }

    function harvest() public harvestWrapper {
        IPool(pool).withdraw(poolId, 0);
        uint256 rewardAmt = IERC20(RewardToken).balanceOf(address(this));
        if (rewardAmt == 0) {
            return;
        }

        uint256 fee = rewardAmt.mul(vault.rewardRate()).div(MAX);

        IERC20(RewardToken).safeTransfer(config.rewarder(), fee);

        rewardAmt = IERC20(RewardToken).balanceOf(address(this));

        if (rewardAmt == 0) {
            return;
        }

        if (token0 != RewardToken) {
            Uni(ammRouter).swapExactTokensForTokens(
                rewardAmt.div(2),
                uint256(0),
                path0,
                address(this),
                block.timestamp.add(1800)
            );
        }
        if (token1 != RewardToken) {
            Uni(ammRouter).swapExactTokensForTokens(
                rewardAmt.div(2),
                uint256(0),
                path1,
                address(this),
                block.timestamp.add(1800)
            );
        }

        Uni(ammRouter).addLiquidity(
            token0,
            token1,
            IERC20(token0).balanceOf(address(this)),
            IERC20(token1).balanceOf(address(this)),
            0,
            0,
            address(this),
            block.timestamp.add(1800)
        ); 

        deposit();
    }

    function balanceOf() public view returns (uint256) {
        return balanceOfPool().add(balanceOfWant());
    }

    function balanceOfPool() public view returns (uint256) {
        UserInfo memory info = pool.userInfo(poolId, address(this));
        return info.amount;
    }

    function balanceOfWant() public view returns (uint256) {
        return IERC20(want).balanceOf(address(this));
    }
}
