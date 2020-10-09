let web3;
let roni;

const initWeb3 = () => {
return new Promise((resolve, reject) => {
    if(typeof window.ethereum !== 'undefined') {
      const web3 = new Web3(window.ethereum);
      window.ethereum.enable()
        .then(() => {
          resolve(
            new Web3(window.ethereum)
          );
        })
        .catch(e => {
          reject(e);
        });
      return;
    }
    if(typeof window.web3 !== 'undefined') {
      return resolve(
        new Web3(window.web3.currentProvider)
      );
    }
    resolve(new Web3(alert(`You are currently not logged in! Please login to your metamask account and switch to infura testnet then try again. Don't have a metamask? Click here (https://metamask.io/download.html)`)));
  });
    
}  

const initContract = () => {
  const contractAddress ='0xe5da649fc3245582a7d3f10d4e061b300ddc1946'
  return new web3.eth.Contract(
    roniABI,
    contractAddress
  );
};

const initApp = () => {
   web3.eth.net.getNetworkType()
.then(result => {
  if(result == 'mainnet'){}
    else{
      alert('please use mainnet')
    }
});

  const name = document.getElementById('name');
  const nameResult = document.getElementById('name-result');
  const stakes = document.getElementById('stakes');
  const stakesResult = document.getElementById('stakes-result');
  const supply = document.getElementById('supply');
  const supplyResult = document.getElementById('supply-result');
  const pool = document.getElementById('pool');
  const poolResult = document.getElementById('pool-result');
  const stakeholder = document.getElementById('stakeholder');
  const stakeholderResult = document.getElementById('stakeholder-result');
  const tstakes = document.getElementById('tstakes');
  const tstakesResult = document.getElementById('tstakes-result');
  const stake = document.getElementById('stake');
  const stakeResult = document.getElementById('stake-result');
  const count = document.getElementById('count');
  const countResult = document.getElementById('count-result');
  const iff = document.getElementById('iff');
  const iffResult = document.getElementById('iff-result');
  const check = document.getElementById('check');
  const checkResult = document.getElementById('check-result');  
  const withdraw = document.getElementById('withdraw');
  const withdrawResult = document.getElementById('withdraw-result');
  const stakeholder1 = document.getElementById('stakeholder1');
  const stakeholderResult1 = document.getElementById('stakeholder-result1');
  const tstakes1 = document.getElementById('tstakes1');
  const tstakesResult1 = document.getElementById('tstakes-result1');
  const stake1 = document.getElementById('stake1');
  const stakeResult1 = document.getElementById('stake-result1');
  const count1 = document.getElementById('count1');
  const countResult1 = document.getElementById('count-result1');
  const iff1 = document.getElementById('iff1');
  const iffResult1 = document.getElementById('iff-result1');
  const check1 = document.getElementById('check1');
  const checkResult1 = document.getElementById('check-result1');  
  const withdraw1 = document.getElementById('withdraw1');
  const withdrawResult1 = document.getElementById('withdraw-result1');
  const stakeholder2 = document.getElementById('stakeholder2');
  const stakeholderResult2 = document.getElementById('stakeholder-result2');
  const tstakes2 = document.getElementById('tstakes2');
  const tstakesResult2 = document.getElementById('tstakes-result2');
  const stake2 = document.getElementById('stake2');
  const stakeResult2 = document.getElementById('stake-result2');
  const count2 = document.getElementById('count2');
  const countResult2 = document.getElementById('count-result2');
  const iff2 = document.getElementById('iff2');
  const iffResult2 = document.getElementById('iff-result2');
  const check2 = document.getElementById('check2');
  const checkResult2 = document.getElementById('check-result2');  
  const withdraw2 = document.getElementById('withdraw2');
  const withdrawResult2 = document.getElementById('withdraw-result2');
  const transfer = document.getElementById('transfer');
  const transferResult = document.getElementById('transfer-result');
  const balance = document.getElementById('balance');
  const balanceResult = document.getElementById('balance-result');
  
  let accounts;
  let accountInterval = setInterval(function() {
  web3.eth.getAccounts().then(_accounts => {
  accounts = _accounts;
  });
   }, 100);

 name.addEventListener('click', (e) => {
    e.preventDefault();
        roni.methods.name().call()
    .then(result => {
      nameResult.innerHTML = result;
    })
    .catch(() => {
      nameResult.innerHTML = `error`;
    }); 
  });

 stakes.addEventListener('click', (e) => {
    e.preventDefault();
        roni.methods.totalStakes().call()
    .then(result => {
      stakesResult.innerHTML = `${web3.utils.fromWei(result.toString(), 'ether')} Roni`;
    })
    .catch(() => {
      stakesResult.innerHTML = `error`;
    });
  });

 supply.addEventListener('click', (e) => {
    e.preventDefault();
        roni.methods.totalSupply().call()
    .then(result => {
      supplyResult.innerHTML = `${web3.utils.fromWei(result.toString(), 'ether')} Roni`;
    })
    .catch(() => {
      supplyResult.innerHTML = `error`;
    });
  });

 pool.addEventListener('click', (e) => {
    e.preventDefault();
        roni.methods.stakingPool().call()
    .then(result => {
      poolResult.innerHTML = `${web3.utils.fromWei(result.toString(), 'ether')} Roni`;
    })
    .catch(() => {
      poolResult.innerHTML = `error`;
    });
  });

 stakeholder.addEventListener('click', (e) => {
    e.preventDefault();
    roni.methods.stakeholdersIndexFor3Months().call()
    .then(result => {
      stakeholderResult.innerHTML = result;
    })
    .catch(_e => {
      stakeholderResult.innerHTML = `error`;
    });
  });

 tstakes.addEventListener('click', (e) => {
    e.preventDefault();
    roni.methods.totalStakesFor3Months().call()
    .then(result => {
      tstakesResult.innerHTML = `${web3.utils.fromWei(result.toString(), 'ether')} Roni`;
    })
    .catch(_e => {
      tstakesResult.innerHTML = `error`;
    });
  });

 stake.addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = e.target.elements[0].value;
    const amountt = web3.utils.toWei(amount.toString(), 'ether');
    roni.methods.stakeFor3Months(amountt).send({from:accounts[0]})
    .then(result => {
      stakeResult.innerHTML = `staking successful`;
    })
    .catch(_e => {
      stakeResult.innerHTML = `error`;
    });
  });

 count.addEventListener('submit', (e) => {
    e.preventDefault();
    const address = e.target.elements[0].value;
    roni.methods.stakesFor3Months(address).call()
    .then(result => {
      countResult.innerHTML = result;
    })
    .catch(_e => {
      countResult.innerHTML = `enter address`;
    });
  });

 iff.addEventListener('submit', (e) => {
    e.preventDefault();
    const address = e.target.elements[0].value;
    roni.methods.stakeholdersFor3Months(address).call()
    .then(result => {
      iffResult.innerHTML = `${result[0]}<br>${result[1]}`;
    })
    .catch(_e => {
      iffResult.innerHTML = `enter address`;
    });
  });

 check.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = e.target.elements[0].value;
    roni.methods.stakeAndLockUpTimeDetailsFor3Months(id).call({from:accounts[0]})
    .then(result => {
      let {0:result1, 1:result2} = result;
      checkResult.innerHTML = `${web3.utils.fromWei(result1.toString(), 'ether')} Roni<br>
      ${(new Date(parseInt(result2) * 1000)).toLocaleString()}`;
    })
    .catch(_e => {
      checkResult.innerHTML = `error, either;<br> You haven't staked in this pool<br>Your stakes isn't up the id number you gave`;
    });
  });

 withdraw.addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = e.target.elements[0].value;
    const amountt = web3.utils.toWei(amount.toString(), 'ether');
    const id = e.target.elements[1].value;
    roni.methods.withdrawStakeAfter3months(amountt, id).send({from: accounts[0]})
    .then(result => {
      withdrawResult.innerHTML = `withdrawal successful`;
    })
    .catch(() => {
      withdrawResult.innerHTML = `error, due to; <br>User have no stake<br>Not enough stake<br> No enough funds in pool`;
    });
  });

 stakeholder1.addEventListener('click', (e) => {
    e.preventDefault();
    roni.methods.stakeholdersIndexFor6Months().call()
    .then(result => {
      stakeholderResult1.innerHTML = result;
    })
    .catch(_e => {
      stakeholderResult1.innerHTML = `error`;
    });
  });

 tstakes1.addEventListener('click', (e) => {
    e.preventDefault();
    roni.methods.totalStakesFor6Months().call()
    .then(result => {
      tstakesResult1.innerHTML = `${web3.utils.fromWei(result.toString(), 'ether')} Roni`;
    })
    .catch(_e => {
      tstakesResult1.innerHTML = `error`;
    });
  });

 stake1.addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = e.target.elements[0].value;
    const amountt = web3.utils.toWei(amount.toString(), 'ether');
    roni.methods.stakeFor6Months(amountt).send({from:accounts[0]})
    .then(result => {
      stakeResult1.innerHTML = `staking successful`;
    })
    .catch(_e => {
      stakeResult1.innerHTML = `error`;
    });
  });

 count1.addEventListener('submit', (e) => {
    e.preventDefault();
    const address = e.target.elements[0].value;
    roni.methods.stakesFor6Months(address).call()
    .then(result => {
      countResult1.innerHTML = result;
    })
    .catch(_e => {
      countResult1.innerHTML = `enter address`;
    });
  });

 iff1.addEventListener('submit', (e) => {
    e.preventDefault();
    const address = e.target.elements[0].value;
    roni.methods.stakeholdersFor6Months(address).call()
    .then(result => {
      iffResult1.innerHTML = `${result[0]}<br>${result[1]}`;
    })
    .catch(_e => {
      iffResult1.innerHTML = `enter address`;
    });
  });

 check1.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = e.target.elements[0].value;
    roni.methods.stakeAndLockUpTimeDetailsFor6Months(id).call({from:accounts[0]})
    .then(result => {
      let {0:result1, 1:result2} = result;
      checkResult1.innerHTML = `${web3.utils.fromWei(result1.toString(), 'ether')} Roni<br>
      ${(new Date(parseInt(result2) * 1000)).toLocaleString()}`;
    })
    .catch(_e => {
      checkResult1.innerHTML = `error, either;<br> You haven't staked in this pool<br>Your stakes isn't up the id number you gave`;
    });
  });

 withdraw1.addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = e.target.elements[0].value;
    const amountt = web3.utils.toWei(amount.toString(), 'ether');
    const id = e.target.elements[1].value;
    roni.methods.withdrawStakeAfter6months(amountt, id).send({from: accounts[0]})
    .then(result => {
      withdrawResult1.innerHTML = `withdrawal successful`;
    })
    .catch(() => {
      withdrawResult1.innerHTML = `error, due to; <br>User have no stake<br>Not enough stake<br> No enough funds in pool`;
    });
  });

 stakeholder2.addEventListener('click', (e) => {
    e.preventDefault();
    roni.methods.stakeholdersIndexFor12Months().call()
    .then(result => {
      stakeholderResult2.innerHTML = result;
    })
    .catch(_e => {
      stakeholderResult2.innerHTML = `error`;
    });
  });

 tstakes2.addEventListener('click', (e) => {
    e.preventDefault();
    roni.methods.totalStakesFor12Months().call()
    .then(result => {
      tstakesResult2.innerHTML = `${web3.utils.fromWei(result.toString(), 'ether')} Roni`;
    })
    .catch(_e => {
      tstakesResult2.innerHTML = `error`;
    });
  });

 stake2.addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = e.target.elements[0].value;
    const amountt = web3.utils.toWei(amount.toString(), 'ether');
    roni.methods.stakeFor12Months(amountt).send({from:accounts[0]})
    .then(result => {
      stakeResult2.innerHTML = `staking successful`;
    })
    .catch(_e => {
      stakeResult2.innerHTML = `error`;
    });
  });

 count2.addEventListener('submit', (e) => {
    e.preventDefault();
    const address = e.target.elements[0].value;
    roni.methods.stakesFor12Months(address).call()
    .then(result => {
      countResult2.innerHTML = result;
    })
    .catch(_e => {
      countResult2.innerHTML = `enter address`;
    });
  });

 iff2.addEventListener('submit', (e) => {
    e.preventDefault();
    const address = e.target.elements[0].value;
    roni.methods.stakeholdersFor12Months(address).call()
    .then(result => {
      iffResult2.innerHTML = `${result[0]}<br>${result[1]}`;
    })
    .catch(_e => {
      iffResult2.innerHTML = `enter address`;
    });
  });

 check2.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = e.target.elements[0].value;
    roni.methods.stakeAndLockUpTimeDetailsFor12Months(id).call({from:accounts[0]})
    .then(result => {
      let {0:result1, 1:result2} = result;
      checkResult2.innerHTML = `${web3.utils.fromWei(result1.toString(), 'ether')} Roni<br>
      ${(new Date(parseInt(result2) * 1000)).toLocaleString()}`;
    })
    .catch(_e => {
      checkResult2.innerHTML = `error, either;<br> You haven't staked in this pool<br>Your stakes isn't up the id number you gave`;
    });
  });

 withdraw2.addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = e.target.elements[0].value;
    const amountt = web3.utils.toWei(amount.toString(), 'ether');
    const id = e.target.elements[1].value;
    roni.methods.withdrawStakeAfter12months(amountt, id).send({from: accounts[0]})
    .then(result => {
      withdrawResult2.innerHTML = `withdrawal successful`;
    })
    .catch(() => {
      withdrawResult2.innerHTML = `error, due to; <br>User have no stake<br>Not enough stake<br> No enough funds in pool`;
    });
  });

 transfer.addEventListener('submit', (e) => {
    e.preventDefault();
    const address = e.target.elements[0].value;
    const amount = e.target.elements[1].value;
    const token =  web3.utils.toWei(amount.toString(), 'ether')
    roni.methods.transfer(address,token).send({from: accounts[0]})
    .then(result => {
      transferResult.innerHTML = `your transfer was successful`;
    })
    .catch(_e => {
      transferResult.innerHTML = `error`;
    });
  });
 
 balance.addEventListener('submit', (e) => {
    e.preventDefault();
    const address = e.target.elements[0].value;
    roni.methods.balanceOf(address).call()
    .then(result => {
      balanceResult.innerHTML = `${web3.utils.fromWei(result.toString(), 'ether')} Roni`;
    })
    .catch(_e => {
      balanceResult.innerHTML = `error`;
    });
  });
}
 document.addEventListener('DOMContentLoaded', () => {
  initWeb3()
    .then(_web3 => {
      web3 = _web3;
      roni = initContract();
      initApp(); 
    })
    .catch(e => console.log(e.message));
})