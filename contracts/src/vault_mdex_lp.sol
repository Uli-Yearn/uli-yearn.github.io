pragma solidity ^0.8.2;
pragma experimental ABIEncoderV2;

import "./vault_base.sol";

struct UserInfo {
    uint256 amount;     
    uint256 rewardDebt; 
    uint256 multLpRewardDebt; 
}

struct PoolInfo {
    address lpToken;
    uint256 allocPoint;
    uint256 lastRewardBlock;  
    uint256 accMdxPerShare; 
    uint256 accMultLpPerShare; 
    uint256 totalAmount;    
}

interface IPool {
    function deposit(uint256 _pid, uint256 _amount) external;
    function withdraw(uint256 _pid, uint256 _amount) external;
    function emergencyWithdraw(uint256 _pid) external;
    function userInfo(uint pid, address user) external view returns (UserInfo memory);
    function poolInfo(uint pid) external view returns (PoolInfo memory);
}

contract AmmLpStrategy is StrategyBase {
    using SafeERC20 for IERC20;
    using Address for address;
    using SafeMath for uint256;

    IPool public pool = IPool(0xFB03e11D93632D97a8981158A632Dd5986F5E909);
    uint public poolId;

    address public RewardToken = 0x25D2e80cB6B86881Fd7e07dd263Fb79f4AbE033c; // mdx

    address[] public path0;
    address[] public path1;

    address public token0;
    address public token1;

    constructor (address _vault, uint _pid, 
        address[] memory _path0,
        address[] memory _path1) StrategyBase(_vault) {
        poolId = _pid;

        vault = IVault(_vault);

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
        require(UniPair(_want).token0() == token0 || UniPair(_want).token0() == token1);
        require(UniPair(_want).token1() == token0 || UniPair(_want).token1() == token1);


        IERC20(RewardToken).safeApprove(mdexRouter, 0);
        IERC20(RewardToken).safeApprove(mdexRouter, type(uint256).max);

        IERC20(token0).safeApprove(mdexRouter, 0);
        IERC20(token0).safeApprove(mdexRouter, type(uint256).max);

        IERC20(token1).safeApprove(mdexRouter, 0);
        IERC20(token1).safeApprove(mdexRouter, type(uint256).max);

        IERC20(want).safeApprove(address(pool), 0);
        IERC20(want).safeApprove(address(pool), type(uint256).max);
    }


    function emergencyWithdrawAll() external onlyVault {
        pool.emergencyWithdraw(poolId);
        IERC20(want).safeTransfer(address(vault), balanceOfWant());
    }

    function _withdrawSome(uint256 _amount) internal override {
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
            pool.deposit(poolId, bal);
        }
    }

    function harvest() public harvestWrapper {
        IPool(pool).deposit(poolId, 0);
        uint256 rewardAmt = IERC20(RewardToken).balanceOf(address(this));
        if (rewardAmt == 0) {
            return;
        }

        uint256 fee = rewardAmt.mul(rewardRate).div(max);

        IERC20(RewardToken).safeTransfer(config.rewarder(), fee);

        rewardAmt = IERC20(RewardToken).balanceOf(address(this));

        if (rewardAmt == 0) {
            return;
        }

        if (token0 != RewardToken) {
            Uni(mdexRouter).swapExactTokensForTokens(
                rewardAmt.div(2),
                uint256(0),
                path0,
                address(this),
                block.timestamp.add(1800)
            );
        }
        if (token1 != RewardToken) {
            Uni(mdexRouter).swapExactTokensForTokens(
                rewardAmt.div(2),
                uint256(0),
                path1,
                address(this),
                block.timestamp.add(1800)
            );
        }

        Uni(mdexRouter).addLiquidity(
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

    function balanceOf() public override view returns (uint256) {
        return balanceOfPool().add(balanceOfWant());
    }

    function balanceOfPool() public override view returns (uint256) {
        UserInfo memory info = pool.userInfo(poolId, address(this));
        return info.amount;
    }

    function balanceOfWant() public override view returns (uint256) {
        return IERC20(want).balanceOf(address(this));
    }
}
