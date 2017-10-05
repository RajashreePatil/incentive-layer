pragma solidity ^0.4.4;

import './AccountManager.sol';
import './TaskGiver.sol';

contract Solver is AccountManager {

	struct Task {
		address owner;
		address[] challengers;
	}

	mapping(uint => Task) tasks;

	event SendSolution(address _from, uint id, bytes32 solution, uint minDeposit);

	function sendBid(address origin, uint id, uint minDeposit, address addr) {
		require(balances[addr] >= minDeposit);
		require(TaskGiver(origin).receiveBid(id, addr));
	}

	function solveTask(bytes32 task, uint id, uint minDeposit) returns (bool) {
		Task t;
		t.owner = tx.origin;
		tasks[id] = t;
		SendSolution(msg.sender, id, 0x0, minDeposit);
		return true;
	}

	function receiveChallenge(uint id, address from) returns (bool) {
		tasks[id].challengers.push(from);
		return true;
	}
}
