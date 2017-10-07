var Solver = artifacts.require('./Solver.sol');
var TaskGiver = artifacts.require('./TaskGiver.sol');
var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

contract('Solver', function(accounts) {
  it("should submit balance and send bid", function() {
  	var solver, taskGiver;
    return Solver.deployed().then(function(instance) {
    	solver = instance;
    	return solver.getBalance.call(accounts[1]);
    }).then(function(balance) {
        //console.log(balance);
    	assert.equal(0, balance.toNumber());
    	return solver.submitDeposit(accounts[1], {value: 10000});
    }).then(function(tx) {
        assert.equal(web3.utils.soliditySha3(accounts[1]), tx.receipt.logs[0].data);
    	return solver.getBalance.call(accounts[1]);
    }).then(function(balance) {
    	assert.equal(10000, balance.toNumber());
        return TaskGiver.deployed();
    }).then(function(_taskGiver) {
        taskGiver = _taskGiver;
        return taskGiver.submitDeposit(accounts[0], {value: 10000});
    }).then(function(tx) {
        return taskGiver.sendTask(accounts[0], 4800, 0x0);
    }).then(function(tx) {
    	return solver.sendBid(taskGiver.address, 0, 4800, accounts[1]);
    }).then(function(tx) {
        assert.equal(web3.utils.soliditySha3(accounts[1]), tx.receipt.logs[0].data);
        return taskGiver.selectSolver(0, {from: accounts[0]});
    }).then(function(tx) {
        return solver.submitSolution(taskGiver.address, accounts[1], 0, "12345", web3.utils.soliditySha3(0x0), web3.utils.soliditySha3("12345"));
    }).then(function(tx) {
        assert.equal(solver.address, tx.logs[0].args.solver);
        return
    });
  });
});
