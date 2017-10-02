var TaskGiver = artifacts.require('./TaskGiver.sol');

contract('TaskGiver', function(accounts) {
  it("should assert true", function() {
  	var taskGiver;
    return TaskGiver.deployed().then(function(instance) {
    	taskGiver = instance;
    	return taskGiver.getBalance.call({from: accounts[0]});
    }).then(function(balance) {
    	assert.equal(0, balance.toNumber());
    	return taskGiver.submitDeposit({value: 10000, from: accounts[0]});
    }).then(function(result) {
    	return taskGiver.getBalance.call({from: accounts[0]});
    }).then(function(balance) {
    	assert.equal(10000, balance.toNumber());
    	return taskGiver.sendTask(5000, {from: accounts[0]});
    }).then(function(tx) {
    	return taskGiver.receiveBid(0, {from: accounts[1]});
    }).then(function(tx) {
        return taskGiver.selectSolver.call(0);
    }).then(function(solver) {
        assert.equal(solver, accounts[1]);
        return
    });
  });
});
