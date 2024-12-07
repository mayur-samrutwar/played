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

    // Add new struct to store score details
    struct ScoreEntry {
        address player;
        uint256 score;
        uint256 timestamp;
    }
    
    // Modify storage: Add array to store all scores for each game
    mapping(uint256 => ScoreEntry[]) public gameLeaderboard;

    // Add this state variable to track submitted scores for each game session
    mapping(uint256 => mapping(address => bool)) public hasSubmittedScore;

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
        
        // Reset submission status when player stakes
        hasSubmittedScore[gameId][msg.sender] = false;
        
        emit GamePlayed(gameId, msg.sender);
    }

    // Modified submitScore function
    function submitScore(uint256 gameId, uint256 score) external nonReentrant {
        require(bytes(gameNames[gameId]).length > 0, "Game does not exist");
        require(!hasSubmittedScore[gameId][msg.sender], "Score already submitted");
        
        // Mark score as submitted before making any state changes
        hasSubmittedScore[gameId][msg.sender] = true;
        
        // Store score in both mappings
        gameScores[gameId][msg.sender] = score;
        
        // Add to leaderboard
        gameLeaderboard[gameId].push(ScoreEntry({
            player: msg.sender,
            score: score,
            timestamp: block.timestamp
        }));
        
        // Calculate and transfer reward
        uint256 reward = score * REWARD_MULTIPLIER;
        (bool success, ) = msg.sender.call{value: reward}("");
        require(success, "Reward transfer failed");
        
        emit ScoreSubmitted(gameId, msg.sender, score, block.timestamp);
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

    // Add new function to get all scores for a game
    function getGameLeaderboard(uint256 gameId) external view returns (ScoreEntry[] memory) {
        require(bytes(gameNames[gameId]).length > 0, "Game does not exist");
        return gameLeaderboard[gameId];
    }

    // Optional: Add function to get top N scores for a game
    function getTopScores(uint256 gameId, uint256 limit) external view returns (ScoreEntry[] memory) {
        require(bytes(gameNames[gameId]).length > 0, "Game does not exist");
        require(limit > 0, "Limit must be greater than 0");
        
        ScoreEntry[] memory allScores = gameLeaderboard[gameId];
        uint256 resultLength = limit < allScores.length ? limit : allScores.length;
        ScoreEntry[] memory topScores = new ScoreEntry[](resultLength);
        
        // Copy array to memory for sorting
        for(uint i = 0; i < allScores.length; i++) {
            for(uint j = i + 1; j < allScores.length; j++) {
                if(allScores[i].score < allScores[j].score) {
                    ScoreEntry memory temp = allScores[i];
                    allScores[i] = allScores[j];
                    allScores[j] = temp;
                }
            }
            if(i < resultLength) {
                topScores[i] = allScores[i];
            }
        }
        
        return topScores;
    }

    // Add withdrawal function for contract owner
    function withdrawFunds() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Withdrawal failed");
    }
}
