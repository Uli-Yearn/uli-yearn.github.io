pragma solidity ^0.8.2;

import "./base.sol";

interface IStrategy {
    function vault() external view returns (address);
    function deposit() external;
    function withdraw(uint) external;
    function withdrawAll() external;
    function emergencyWithdrawAll() external;
    function balanceOf() external view returns (uint);
    function harvest() external;
}

contract VaultConfig {
    address public governance;
    address public pendingGovernance;

    uint public minHarvestInterval = 20 * 5; // 5min

    address public rewarder;

    mapping(address => bool) public farmers;

    event NewGovernance(address indexed newAdmin);
    event NewPendingGovernance(address indexed newPendingAdmin);

    constructor() {
        governance = msg.sender;
        rewarder = msg.sender;
    } 

    modifier admin {
        require(msg.sender == governance, "!governance");
        _;
    }

    function acceptGovernance() public {
        require(msg.sender == pendingGovernance);
        governance = msg.sender;
        pendingGovernance = address(0);

        emit NewGovernance(governance);
    }

    function setPendingGovernance(address pendingAdmin_) public admin {
        pendingGovernance = pendingAdmin_;

        emit NewPendingGovernance(pendingAdmin_);
    }

    function updateMinHarvestInterval(uint x) public admin {
        minHarvestInterval = x;
    }

    function updateRewarder(address x) public admin {
        require(x != address(0));
        rewarder = x;
    }

    function toggleFarmer(address _f, bool b) public admin {
        farmers[_f] = b;
    }
}

interface IVault {
    function want() external view returns (address);
    function config() external view returns (address);
}

abstract contract StrategyBase {
    IVault vault;
    VaultConfig config;
    address want;

    modifier admin {
        require(msg.sender == config.governance(), "!admin");
        _;
    }

    modifier onlyVault {
        require(msg.sender == address(vault), "!vault");
        _;
    }

    modifier harvestWrapper {
        require(msg.sender == config.governance() || config.farmers(msg.sender))
        _;
    }


    constructor(address _vault) {
        vault = IVault(_vault);
        config = VaultConfig(vault.config());
        want = vault.want();
    }
}

contract YearnVaultV1 {
    using SafeERC20 for IERC20;
    using Address for address;
    using SafeMath for uint256;

    event UpdateStrategist(address indexed strategist, bool status);

    uint public rewardRate = 500;

    uint public constant MAX = 10000;

    mapping (address => uint256) private _balances;
    uint8 private _decimals;
    uint256 private _totalSupply;

    IERC20 public want;

    bool public canDeposit = true; 

    VaultConfig public config;

    bool private unlocked = true;

    address public pendingStrategy;
    address public currentStrategy;

    mapping (address => bool) public strategists;

    constructor(address _config, address _want) {
        config = VaultConfig(_config);
        want = IERC20(_want);
        require(want.totalSupply() > 0);
        _decimals = IERC20(_want).decimals();
    }

    modifier lock() {
        require(unlocked, 'LOK');
        unlocked = false;
        _;
        unlocked = true;
    }

    modifier admin {
        require(msg.sender == config.governance(), "!admin");
        _;
    }

    modifier adminOrStrategist {
        require(msg.sender == config.governance() || strategists[msg.sender], "!aos");
        _;
    }

    modifier onlyHuman {
        require(msg.sender == tx.origin);
        _;
    }

    function toggleStrategist(address _s, bool _b) public admin {
        strategists[_s] = _b;
        emit UpdateStrategist(_s, _b);
    }

    function setPendingStrategy(address _ps) public adminOrStrategist {
        require(_ps != address(0));
        require(IStrategy(_ps).vault() == address(this));
        pendingStrategy = _ps;
    }

    function approveStrategy(uint slippage) public admin {
        require(pendingStrategy != address(0) && pendingStrategy != currentStrategy);
        if (currentStrategy != address(0)) {
            IStrategy(currentStrategy).withdrawAll();
        }
        currentStrategy = pendingStrategy;
        // test strategy
        uint before = IERC20(want).balanceOf(address(this)); 
        earn()
        IStrategy(currentStrategy).withdrawAll();
        uint after = IERC20(want).balanceOf(address(this)); 
        require(after >= before.mul(10000.sub(slippage)).div(10000), "!ste"); // strategy has a slippage bug

        earn();
    }

    function updateRewardRate(uint x) public admin {
        require(rewardRate <= MAX);
        rewardRate = x;
    }

    function updateCanDeposit(bool x) public admin {
        canDeposit = x;
    }

    function balanceOfStrategy() public view returns (uint256) {
        return IStrategy(currentStrategy).balanceOf();
    }

    function balanceOfWant() public view returns (uint256) {
        return IERC20(want).balanceOf(address(this));
    }

    function totalBalance() public view returns (uint256) {
        return balanceOfWant().add(balanceOfStrategy());
    }

    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    function decimals() public view returns (uint8) {
        return _decimals;
    }

    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }
    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: mint to the zero address");

        _totalSupply = _totalSupply.add(amount);
        _balances[account] = _balances[account].add(amount);
    }
    function _burn(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: burn from the zero address");

        _balances[account] = _balances[account].sub(amount, "ERC20: burn amount exceeds");
        _totalSupply = _totalSupply.sub(amount);
    }

    function _withdrawSome(uint256 _amount) internal {
        require(currentStrategy != address(0), "!s");
        IStrategy(currentStrategy).withdraw(_amount);
    }


    function getPricePerFullShare() public view returns (uint) {
        if (totalSupply() == 0) {
            return 1e18;
        }
        return totalBalance().mul(1e18).div(totalSupply());
    }

    function earn() public {
        require(currentStrategy != address(0));
        uint bal = balanceOfWant();
        if (bal > 0) {
            IERC20(want).safeTransfer(currentStrategy, bal);
            IStrategy(currentStrategy).deposit();
        }
    }

    function depositAll() external {
        deposit(want.balanceOf(msg.sender));
    }

    function deposit(uint _amount) public onlyHuman lock {
        require(canDeposit && _amount > 0);

        uint _pool = totalBalance();
        uint _before = balanceOfWant();
        want.safeTransferFrom(msg.sender, address(this), _amount);
        uint _after = balanceOfWant();

        _amount = _after.sub(_before); 
        uint shares = 0;
        if (totalSupply() == 0) {
            shares = _amount;
        } else {
            shares = (_amount.mul(totalSupply())).div(_pool);
        }
        _mint(msg.sender, shares);
        earn();
    }

    function withdrawAll() external {
        withdraw(balanceOf(msg.sender));
    }

    function withdraw(uint _shares) public onlyHuman lock {
        require(_shares > 0);
        uint r = (totalBalance().mul(_shares)).div(totalSupply());
        _burn(msg.sender, _shares);

        uint b = want.balanceOf(address(this));
        if (b < r) {
            uint _withdraw = r.sub(b);
            _withdrawSome(_withdraw);
            uint _after = want.balanceOf(address(this));
            uint _diff = _after.sub(b);
            if (_diff < _withdraw) {
                r = b.add(_diff);
            }
        }
        want.safeTransfer(msg.sender, r);
    }

    function govWithdrawAll() external admin {
        IStrategy(currentStrategy).withdrawAll();
    }

    function govEmergencyWithdrawAll() external admin {
        IStrategy(currentStrategy).emergencyWithdrawAll();
    }

    function govWithdrawSome(uint _amt) external admin {
        _withdrawSome(_amt);
    }

    function govInCaseTokensGetStuck(IERC20 _asset, address target) external admin {
        require(address(want) != address(_asset), "want");
        uint b = _asset.balanceOf(address(this));
        if (b > 0) {
            _asset.safeTransfer(target, b);
        }
    }

    // receive() external payable {}
}
