pragma solidity ^0.4.4;

contract AccountManager {
  
  mapping(address => uint) balances;
  function AccountManager() {
    
  }

  function getBalance(address addr) returns (uint) {
  	return balances[addr];
  }

  function submitDeposit(address addr) payable returns (bool) {
  	uint balance = balances[addr];
  	balances[addr] = balance + msg.value;
    log0(sha3(addr));
  }

}
