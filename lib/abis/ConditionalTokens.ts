export const ConditionalTokensABI = [
    {
        "constant": false,
        "inputs": [
            { "name": "collateralToken", "type": "address" },
            { "name": "parentCollectionId", "type": "bytes32" },
            { "name": "conditionId", "type": "bytes32" },
            { "name": "indexSets", "type": "uint256[]" }
        ],
        "name": "redeemPositions",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            { "name": "collateralToken", "type": "address" },
            { "name": "parentCollectionId", "type": "bytes32" },
            { "name": "conditionId", "type": "bytes32" },
            { "name": "indexSets", "type": "uint256[]" }
        ],
        "name": "getPayoutNumerator",
        "outputs": [{ "name": "numerator", "type": "uint256" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    }
] as const;
