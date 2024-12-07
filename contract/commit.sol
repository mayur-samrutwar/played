// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BattleArena is ReentrancyGuard, Ownable {
    struct Battle {
        address player1;
        address player2;
        uint256 stakeAmount;
        uint256 player1Score;
        uint256 player2Score;
        bool isComplete;
        bool hasPlayer1Registered;
        bool hasPlayer2Registered;
    }

    // Battle ID to Battle mapping
    mapping(uint256 => Battle) public battles;
    uint256 public nextBattleId;

    // Events
    event BattleCreated(uint256 battleId, address player1, uint256 stakeAmount);
    event PlayerJoined(uint256 battleId, address player2);
    event BattleCompleted(uint256 battleId, address winner, uint256 prize);
    event ScoreSubmitted(uint256 battleId, address player, uint256 score);

    // Create a new battle
    function createBattle() external payable nonReentrant returns (uint256) {
        require(msg.value > 0, "Stake amount must be greater than 0");

        uint256 battleId = nextBattleId++;
        Battle storage battle = battles[battleId];
        
        battle.player1 = msg.sender;
        battle.stakeAmount = msg.value;
        battle.hasPlayer1Registered = true;

        emit BattleCreated(battleId, msg.sender, msg.value);
        return battleId;
    }

    // Join an existing battle
    function joinBattle(uint256 battleId) external payable nonReentrant {
        Battle storage battle = battles[battleId];
        
        require(!battle.isComplete, "Battle is already complete");
        require(battle.player1 != address(0), "Battle does not exist");
        require(!battle.hasPlayer2Registered, "Battle is full");
        require(msg.sender != battle.player1, "Cannot join your own battle");
        require(msg.value == battle.stakeAmount, "Must match stake amount");

        battle.player2 = msg.sender;
        battle.hasPlayer2Registered = true;

        emit PlayerJoined(battleId, msg.sender);
    }

    // Submit score for a player
    function submitScore(uint256 battleId, uint256 score) external {
        Battle storage battle = battles[battleId];
        
        require(!battle.isComplete, "Battle is already complete");
        require(battle.hasPlayer1Registered && battle.hasPlayer2Registered, "Battle not ready");
        require(msg.sender == battle.player1 || msg.sender == battle.player2, "Not a participant");

        if (msg.sender == battle.player1) {
            require(battle.player1Score == 0, "Score already submitted");
            battle.player1Score = score;
        } else {
            require(battle.player2Score == 0, "Score already submitted");
            battle.player2Score = score;
        }

        emit ScoreSubmitted(battleId, msg.sender, score);

        // If both scores are submitted, complete the battle
        if (battle.player1Score > 0 && battle.player2Score > 0) {
            _completeBattle(battleId);
        }
    }

    // Internal function to complete battle and distribute prizes
    function _completeBattle(uint256 battleId) internal {
        Battle storage battle = battles[battleId];
        battle.isComplete = true;

        address winner;
        if (battle.player1Score > battle.player2Score) {
            winner = battle.player1;
        } else if (battle.player2Score > battle.player1Score) {
            winner = battle.player2;
        } else {
            // In case of a tie, split the stake
            uint256 halfStake = battle.stakeAmount;
            (bool success1, ) = battle.player1.call{value: halfStake}("");
            require(success1, "Transfer failed");
            (bool success2, ) = battle.player2.call{value: halfStake}("");
            require(success2, "Transfer failed");
            emit BattleCompleted(battleId, address(0), battle.stakeAmount * 2);
            return;
        }

        // Transfer total stake to winner
        uint256 totalPrize = battle.stakeAmount * 2;
        (bool success, ) = winner.call{value: totalPrize}("");
        require(success, "Transfer failed");
        
        emit BattleCompleted(battleId, winner, totalPrize);
    }

    // View functions
    function getBattle(uint256 battleId) external view returns (Battle memory) {
        return battles[battleId];
    }

    function getBattleStatus(uint256 battleId) external view returns (
        bool isComplete,
        address player1,
        address player2,
        uint256 stakeAmount,
        uint256 player1Score,
        uint256 player2Score
    ) {
        Battle memory battle = battles[battleId];
        return (
            battle.isComplete,
            battle.player1,
            battle.player2,
            battle.stakeAmount,
            battle.player1Score,
            battle.player2Score
        );
    }
}
