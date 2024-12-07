// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Games is ReentrancyGuard, Ownable {
    constructor() Ownable(msg.sender) {}

    // Game ID to player address to score mapping
    mapping(uint256 => mapping(address => uint256)) public gameScores;
    mapping(uint256 => string) public gameNames;
    uint256 public nextGameId;

    // Add constants for stake amount and reward multiplier
    uint256 public constant STAKE_AMOUNT = 0.00025 ether;
    uint256 public constant REWARD_MULTIPLIER = 0.0000025 ether;

    // Enhanced event with indexed gameId for easier filtering
    event GameCreated(uint256 indexed gameId, string name);
    event ScoreSubmitted(
        uint256 indexed gameId, 
        address indexed player, 
        uint256 score,
        uint256 timestamp
    );
    event GamePlayed(uint256 indexed gameId, address indexed player);

    // Create a new game
    function createGame(string memory gameName) external onlyOwner returns (uint256) {
        uint256 gameId = nextGameId++;
        gameNames[gameId] = gameName;
        
        emit GameCreated(gameId, gameName);
        return gameId;
    }

    // New function to stake and play game
    function playGame(uint256 gameId) external payable nonReentrant {
        require(bytes(gameNames[gameId]).length > 0, "Game does not exist");
        require(msg.value == STAKE_AMOUNT, "Incorrect stake amount");
        
        emit GamePlayed(gameId, msg.sender);
    }

    // Modified submitScore function
    function submitScore(uint256 gameId, uint256 score) external nonReentrant {
        require(bytes(gameNames[gameId]).length > 0, "Game does not exist");
        
        gameScores[gameId][msg.sender] = score;
        
        // Calculate and transfer reward
        uint256 reward = score * REWARD_MULTIPLIER;
        (bool success, ) = msg.sender.call{value: reward}("");
        require(success, "Reward transfer failed");
        
        emit ScoreSubmitted(
            gameId, 
            msg.sender, 
            score,
            block.timestamp
        );
    }

    // Get score for a specific game and player
    function getScore(uint256 gameId, address player) external view returns (uint256) {
        require(bytes(gameNames[gameId]).length > 0, "Game does not exist");
        return gameScores[gameId][player];
    }

    // Get game name from ID
    function getGameName(uint256 gameId) external view returns (string memory) {
        require(bytes(gameNames[gameId]).length > 0, "Game does not exist");
        return gameNames[gameId];
    }
}
