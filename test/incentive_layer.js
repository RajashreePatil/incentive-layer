const IncentiveLayer = artifacts.require('./IncentiveLayer.sol')
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"))

const timeout = require('./helpers/timeout')
const mineBlocks = require('./helpers/mineBlocks')

contract('IncentiveLayer', function(accounts) {
  let incentiveLayer, deposit, bond, tx, log, taskID, intent, oldBalance

  const taskGiver = accounts[1]
  const solver = accounts[2]
  const verifier = accounts[3]

  const minDeposit = 500
  const reward = web3.utils.toWei('1', 'ether')
  const randomBits = 12345

  context('incentive layer', () => {

    before(async () => {
      incentiveLayer = await IncentiveLayer.new()
      oldBalance = await web3.eth.getBalance(solver)
    })

    it("should have participants make deposits", async () => {
      // taskGiver makes a deposit
      await incentiveLayer.makeDeposit({from: taskGiver, value: 1000})
      deposit = await incentiveLayer.getDeposit.call(taskGiver)
      assert(deposit.eq(1000))

      // to-be solver makes a deposit
      await incentiveLayer.makeDeposit({from: solver, value: 1000})
      deposit = await incentiveLayer.getDeposit.call(solver)
      assert(deposit.eq(1000))

      // to-be verifier makes a deposit
      await incentiveLayer.makeDeposit({from: verifier, value: 1000})
      deposit = await incentiveLayer.getDeposit.call(verifier)
      assert(deposit.eq(1000))
    })

    it("should create task", async () => {
      // taskGiver creates a task.
      // they bond part of their deposit.
      tx = await incentiveLayer.createTask(minDeposit, 0x0, 5, {from: taskGiver, value: reward})
      bond = await incentiveLayer.getBondedDeposit.call(0, taskGiver)
      assert(bond.eq(500))
      deposit = await incentiveLayer.getDeposit.call(taskGiver)
      assert(deposit.eq(500))

      log = tx.logs.find(log => log.event === 'DepositBonded')
      assert(log.args.taskID.eq(0))
      assert.equal(log.args.account, taskGiver)
      assert(log.args.amount.eq(minDeposit))

      log = tx.logs.find(log => log.event === 'TaskCreated')
      assert(log.args.taskID.isZero())
      assert(log.args.minDeposit.eq(minDeposit))
      assert(log.args.blockNumber.eq(5))
      assert(log.args.reward.eq(reward))

      taskID = log.args.taskID
    })

    it("should select a solver", async () => {
      // solver registers for the task.
      // they bond part of their deposit.
      tx = await incentiveLayer.registerForTask(taskID, web3.utils.soliditySha3(randomBits), {from: solver})

      log = tx.logs.find(log => log.event === 'DepositBonded')
      assert(log.args.taskID.eq(taskID))
      assert.equal(log.args.account, solver)
      assert(log.args.amount.eq(minDeposit))
      deposit = await incentiveLayer.getDeposit.call(solver)
      assert(deposit.eq(500))

      log = tx.logs.find(log => log.event === 'SolverSelected')
      assert(log.args.taskID.eq(taskID))
      assert.equal(log.args.solver, solver)
      assert.equal(log.args.taskData, 0x0)
      assert(log.args.minDeposit.eq(minDeposit))
      assert.equal(log.args.randomBitsHash, web3.utils.soliditySha3(randomBits))
    })

    it("should commit a solution", async () => {
      // solver commits their solutions.
      tx = await incentiveLayer.commitSolution(taskID, web3.utils.soliditySha3(0x0), web3.utils.soliditySha3(0x12345), {from: solver})
      log = tx.logs.find(log => log.event === 'SolutionsCommitted')
      assert(log.args.taskID.eq(taskID))
      assert(log.args.minDeposit.eq(minDeposit))
    })

    it("should commit a challenge", async () => {
      // verifier commits a challenge
      // they bond part of their deposit.
      intent = 0
      tx = await incentiveLayer.commitChallenge(taskID, web3.utils.soliditySha3(intent), {from: verifier})
      log = tx.logs.find(log => log.event === 'DepositBonded')
      assert(log.args.taskID.eq(taskID))
      assert.equal(log.args.account, verifier)
      assert(log.args.amount.eq(minDeposit))
      deposit = await incentiveLayer.getDeposit.call(verifier)
      assert(deposit.eq(500))

      await mineBlocks(web3, 20)

      // taskGiver triggers task state transition
      tx = await incentiveLayer.changeTaskState(taskID, 3, {from: taskGiver})
      log = tx.logs.find(log => log.event === 'TaskStateChange')
      assert(log.args.taskID.eq(taskID))
      assert(log.args.state.eq(3))
    })

    it("should reveal intent", async () => {
      // state 3: challenges accepted
      // verifier reveals their intent
      await incentiveLayer.revealIntent(taskID, intent, {from: verifier})

      await mineBlocks(web3, 10)

      // taskGiver triggers task  state transition
      tx = await incentiveLayer.changeTaskState(taskID, 4, {from: taskGiver})
      log = tx.logs.find(log => log.event === 'TaskStateChange')
      assert(log.args.taskID.eq(taskID))
      assert(log.args.state.eq(4))
    })

    it("should reveal solution", async () => {

      // state 4: intents revealed
      tx = await incentiveLayer.revealSolution(taskID, true, randomBits, {from: solver})
      log = tx.logs.find(log => log.event === 'SolutionRevealed')
      if(log) {
        assert(log.args.taskID.eq(taskID))
        assert(log.args.randomBits.eq(randomBits))
      } else {
        assert((await incentiveLayer.getTaskFinality.call(taskID)).eq(2))
      }
    })

    it('should run verification game', async () => {
      await incentiveLayer.runVerificationGame(taskID, {from: verifier})

      await incentiveLayer.finalizeTask(taskID, {from: taskGiver})

      assert((await incentiveLayer.getTaskFinality.call(taskID)).eq(1))
    })

    it('should unbond solver deposit', async () => {
      await incentiveLayer.unbondDeposit(taskID, {from: solver})
      assert((await incentiveLayer.getDeposit.call(solver)).eq(1000))
    })

    it('should unbond task giver deposit', async () => {
      await incentiveLayer.unbondDeposit(taskID, {from: taskGiver})
      assert((await incentiveLayer.getDeposit.call(taskGiver)).eq(1000))
    })

    it('should unbond verifier deposit', async () => {
      await incentiveLayer.unbondDeposit(taskID, {from: verifier})
      assert((await incentiveLayer.getDeposit.call(verifier)).eq(1000))
    })

    it('should be higher than original balance', async () => {
      const newBalance = await web3.eth.getBalance(solver)

      console.log("Old balance: " + oldBalance)
      console.log("New Balance: " + newBalance)
      const lessThan = oldBalance < newBalance
      console.log(lessThan)
      assert(lessThan)
    })
  })
})
