// Adapted from SavjeeCoin by Xavier Decuyper (Savjee)
// Reference: https://github.com/Savjee/SavjeeCoin/blob/master/src

const SHA256 = require('crypto-js/sha256');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

class TransRecord {
    constructor(f, t, a) {
        this.fAddr = f;
        this.tAddr = t;
        this.am = a;
    }

    /**
     * Creates a SHA256 hash of the transaction
     *
     * @returns {string}
     */
    calculateH() {
        return SHA256(this.fAddr + this.tAddr + this.am).toString();
    }


    /**
     * Signs a transaction with the given signingKey (which is an Elliptic keypair
     * object that contains a private key). The signature is then stored inside the
     * transaction object and later stored on the blockchain.
     *
     * @param {string} signingKey
     */
    signTrans(signingKey) {
        // You can only send a transaction from the wallet that is linked to your
        // key. So here we check if the fromAddress matches your publicKey
        if (signingKey.getPublic('hex') !== this.fAddr) {
            throw new Error('You cannot sign transactions for other wallets!');
        }

        // Calculate the hash of this transaction, sign it with the key
        // and store it inside the transaction object
        const hashTx = this.calculateH();
        const sh = signingKey.sign(hashTx, 'base64')
        this.sig = sh.toDER('hex')
    }

    /**
     * Checks if the signature is valid (transaction has not been tampered with).
     * It uses the fromAddress as the public key.
     *
     * @returns {boolean}
     */
    isTransValid() {
        // If the transaction doesn't have a from address we assume it's a
        // mining reward and that it's valid. You could verify this in a
        // different way (special field for instance)
        if (this.fAddr === null) return true;

        if (!this.sig || this.sig.length === 0) {
            throw new Error('No signature in this transaction');
        }

        const publicKey = ec.keyFromPublic(this.fAddr, 'hex');
        return publicKey.verify(this.calculateH(), this.sig);
    }
}

class Bk {
    /**
     * @param {number} timestamp
     * @param {Transaction[]} transactions
     * @param {string} previousHash
     */
    constructor(timestamp, transactions, previousHash = '') {
        this.ts = timestamp;
        this.trans = transactions;
        this.ph = previousHash;
        this.number = 0; // nonce - must be set BEFORE the first calHash()
        this.hs = this.calHash();
    }

    /**
     * Returns the SHA256 of this block (by processing all the data stored
     * inside this block)
     *
     * @returns {string}
     */
    calHash() {
        return SHA256(this.ts + JSON.stringify(this.trans) + this.ph + this.number).toString();
    }

    /**
     * Starts the mining process on the block. It changes the 'nonce' until the hash
     * of the block starts with enough zeros (= difficulty)
     *
     * @param {number} difficulty
     */
    mineBlock(difficulty) {
        while (this.hs.substring(0, difficulty) != Array(difficulty + 1).join("0")) {
            this.number++;
            this.hs = this.calHash();
        }
        console.log("Block mined: " + this.hs);
    }

    /**
     * Validates all the transactions inside this block (signature + hash) and
     * returns true if everything checks out. False if the block is invalid.
     *
     * @returns {boolean}
     */
    hasValidTrans() {
        for (const tx of this.trans) {
            if (!tx.isTransValid()) {
                return false;
            }
        }

        return true;
    }
}

class Bkchain {
    constructor() {
        this.bkarr = [this.createGenesisBlock()];
        this.difficulty = 5;
        this.pendingTrans = [];
        this.mReward = 1000;
    }

    /**
     * @returns {Bk}
     */
    createGenesisBlock() {
        return new Bk("01/01/2027", [], "0");
    }


    /**
     * Returns the latest block on our chain. Useful when you want to create a
     * new Block and you need the hash of the previous Block.
     *
     * @returns {Bk[]}
     */
    getLatestBlock() {
        return this.bkarr[this.bkarr.length - 1];
    }

    /**
     * Takes all the pending transactions, puts them in a Block and starts the
     * mining process. It also adds a transaction to send the mining reward to
     * the given address.
     *
     * @param {string} mAddr
     */
    minePendingTrans(mAddr) {
        const rTx = new TransRecord(
            null,
            mAddr,
            this.mReward
        );
        this.pendingTrans.push(rTx);

        let block = new Bk(
            Date.now(),
            this.pendingTrans,
            this.getLatestBlock().hs
        );
        block.mineBlock(this.difficulty);

        this.bkarr.push(block);

        this.pendingTrans = [];
    }

    /**
     * Add a new transaction to the list of pending transactions (to be added
     * next time the mining process starts). This verifies that the given
     * transaction is properly signed.
     *
     * @param {TransRecord} t
     */
    addTrans(t) {
        if (!t.fAddr || !t.tAddr) {
            throw new Error('Transaction must include from and to address');
        }

        if (!t.isTransValid()) {
            throw new Error('Cannot add invalid transaction to chain');
        }

        /*additional materials*/
        // if (t.am <= 0) {
        //     throw new Error('Transaction amount should be higher than 0');
        // }

        // // Making sure that the amount sent is not greater than existing balance
        // const walletBalance = this.getBalanceOfAddress(t.fAddr);
        // if (walletBalance < t.am) {
        //     throw new Error('Not enough balance');
        // }

        // // Get all other pending transactions for the "from" wallet
        // const pendingTxForWallet = this.pendingTrans.filter(
        //     tx => tx.fAddr === t.fAddr
        // );

        // // If the wallet has more pending transactions, calculate the total amount
        // // of spend coins so far. If this exceeds the balance, we refuse to add this
        // // transaction.
        // if (pendingTxForWallet.length > 0) {
        //     const totalPendingAmount = pendingTxForWallet
        //         .map(tx => tx.am)
        //         .reduce((prev, curr) => prev + curr);

        //     const totalAmount = totalPendingAmount + t.am;
        //     if (totalAmount > walletBalance) {
        //         throw new Error(
        //             'Pending transactions for this wallet is higher than its balance.'
        //         );
        //     }
        // }

        this.pendingTrans.push(t);
    }


    /**
     * Returns the balance of a given wallet address.
     *
     * @param {string} address
     * @returns {number} The balance of the wallet
     */
    getBalanceOfAddress(address) {
        let balance = 0;
        for (const block of this.bkarr) {
            for (const t of block.trans) {
                if (t.fAddr === address) {
                    balance -= t.am;
                }

                if (t.tAddr === address) {
                    balance += t.am;
                }
            }
        }

        return balance;
    }

    /* additional materials */
    // /**
    //  * Returns a list of all transactions that happened
    //  * to and from the given wallet address.
    //  *
    //  * @param  {string} address
    //  * @return {Transaction[]}
    //  */
    // getAllTransactionsForWallet(address) {
    //     const txs = [];

    //     for (const block of this.chain) {
    //         for (const tx of block.transactions) {
    //             if (tx.fromAddress === address || tx.toAddress === address) {
    //                 txs.push(tx);
    //             }
    //         }
    //     }

    //     debug('get transactions for wallet count: %s', txs.length);
    //     return txs;
    // }

    /**
     * Loops over all the blocks in the chain and verify if they are properly
     * linked together and nobody has tampered with the hashes. By checking
     * the blocks it also verifies the (signed) transactions inside of them.
     *
     * @returns {boolean}
     */
    isChainValid() {
        /*additional materials*/
        // // Check if the Genesis block hasn't been tampered with by comparing
        // // the output of createGenesisBlock with the first block on our chain
        // const realGenesis = JSON.stringify(this.createGenesisBlock());

        // if (realGenesis !== JSON.stringify(this.chain[0])) {
        //     return false;
        // }

        // Check the remaining blocks on the chain to see if there hashes and
        // signatures are correct
        for (let j = 1; j < this.bkarr.length; j++) {
            const currentBlock = this.bkarr[j];
            const previousBlock = this.bkarr[j - 1];

            if (previousBlock.hs !== currentBlock.ph) {
                return false;
            }

            if (!currentBlock.hasValidTrans()) {
                return false;
            }

            if (currentBlock.hs !== currentBlock.calHash()) {
                return false
            }
        }

        return true;
    }
}

// Your private key goes here
const myKey = ec.keyFromPrivate(
  '7c4c45907dec40c91bab3480c39032e90049f1a44f3e18c3e07c23e3273995cf'
);

// From that we can calculate your public key (which doubles as your wallet address)
const myWalletAddress = myKey.getPublic('hex');

// Create new instance of Blockchain class
const YourCoin = new Bkchain();

// Create a transaction & sign it with your key
const tx1 = new TransRecord(myWalletAddress, 'otherWalletAddress', 10);
tx1.signTrans(myKey);
YourCoin.addTrans(tx1);

// Mine block
console.log('\nStarting the miner...');
YourCoin.minePendingTrans(myWalletAddress);

console.log('\nBalance of myWalletAddress is ',
YourCoin.getBalanceOfAddress(myWalletAddress));

// Uncomment this line if you want to test tampering with the chain
// (must differ from tx1's original amount of 10, otherwise it is a no-op
//  and the chain still validates)
// YourCoin.bkarr[1].trans[0].am = 999;

// Check if the chain is valid
console.log();
console.log('Blockchain valid?', YourCoin.isChainValid());


/* 
 * class TransRecord
 *   (1)  f
 *   (2)  t
 *   (3)  this.fAddr + this.tAddr + this.am
 *   (4)  this.fAddr
 *   (5)  this.calculateH()
 *   (6)  sh.toDER('hex')
 *   (7)  !this.sig || this.sig.length === 0
 *   (8)  this.fAddr
 *   (9)  this.calculateH(), this.sig
 *
 * class Bk
 *   (10) this.calHash()
 *   (11) this.ts + JSON.stringify(this.trans) + this.ph + this.number
 *   (12) this.number++
 *   (13) this.calHash()
 *   (14) this.hs
 *   (15) of this.trans
 *   (16) !tx.isTransValid()
 *   (17) return true
 *
 * class Bkchain
 *   (18) this.difficulty = 5;                          // any small int; 2 for fast demos
 *   (19) [new TransRecord(null, 'Genesis', 0)]         // [] still works fine genesis holds no transactions
 *   (20) this.bkarr[this.bkarr.length - 1]
 *   (21) new TransRecord(null, mAddr, this.mReward)
 *   (22) this.pendingTrans.push(rTx)
 *   (23) this.pendingTrans
 *   (24) this.getLatestBlock().hs
 *   (25) this.difficulty
 *   (26) this.bkarr.push(block)
 *   (27) this.pendingTrans = []
 *   (28) !t.fAddr || !t.tAddr
 *   (29) !t.isTransValid()
 *   (30) this.pendingTrans.push(t)
 *   (31) of this.bkarr
 *   (32) of block.trans
 *   (33) return balance
 *   (34) currentBlock.calHash()             // see note M9 — comparison must be !==
 *   (35) previousBlock.hs                   // see note M9 — comparison must be !==
 *
 *
 * ============================================================================
 * MISTAKES IN "MCQ exercise.pdf" (errors in the pre-printed code, not blanks)
 * ============================================================================
 *
 * M1.  calculateH() calls `SHA255(...)`. No such function — it is `SHA256`,
 *      the name bound by the require() on line 1.
 *
 * M2.  The block class is declared `class Bk`, but createGenesisBlock() and
 *      minePendingTrans() both do `new Block(...)`. `Block` is undefined →
 *      ReferenceError at construction.
 *
 * M3.  Bk defines `hasValidTrans()`, but isChainValid() calls
 *      `currentBlock.hasValidTransactions()`. Wrong name → TypeError.
 *
 * M4.  isChainValid() declares the loop counter as `j`
 *      (`for(let j = 1; j < chain.length; j++)`) but indexes with `i`
 *      (`chain[i]`, `chain[i - 1]`). `i` is undefined → ReferenceError.
 *
 * M5.  isChainValid() reads a bare `chain`. The array is a field of the
 *      instance and is named `bkarr`, so every reference must be `this.bkarr`.
 *
 * M6.  isChainValid(): `if(currentBlock.hasValidTransactions()) return false;`
 *      is inverted. A block whose transactions ARE valid would fail the chain.
 *      Needs the `!` — `if(!currentBlock.hasValidTrans())`.
 *
 * M7.  isChainValid() reads `currentBlock.hash` and `currentBlock.previousHash`.
 *      Bk stores those as `hs` and `ph`. Both are undefined as written.
 *
 * M8.  Blanks (34)/(35) sit behind `==`. Both tests are integrity checks and
 *      must be inequalities (`!==`): return false when the stored hash does
 *      NOT match the recomputed hash, and when the stored previous-hash does
 *      NOT match the previous block's hash. As printed, the chain is reported
 *      invalid precisely when it is intact.
 *
 * M9.  getBalanceOfAddress(): the inner loop binds `const t`, but the body
 *      uses `trans.fromAddress`, `trans.toAddress`, `trans.amount`. `trans` is
 *      not in scope, and the TransRecord fields are `fAddr` / `tAddr` / `am`.
 *
 * M10. getBalanceOfAddress(): the signs are swapped. Money leaving an address
 *      (`fAddr === address`) must SUBTRACT and money arriving (`tAddr`) must
 *      ADD. The PDF does the opposite, so every balance comes out negated.
 *
 * M11. Bk constructor sets `this.hs = calHash()` BEFORE `this.number = 0`.
 *      calHash() therefore hashes `undefined` as the nonce, so a block that is
 *      never mined (the genesis block) stores a hash that its own calHash()
 *      can no longer reproduce.
 *
 * M12. TransRecord.isTransValid() has no mining-reward case. The reward
 *      transaction created in minePendingTrans() is built with
 *      `fAddr = null` and is never signed, so hasValidTrans() throws
 *      'No signature in this transaction' on every mined block. Needs an
 *      early `if (this.fAddr === null) return true;`.
 *
 * M13. calHash() concatenates `this.trans` (an array) straight into SHA256,
 *      relying on Array.prototype.toString(). "[object Object],[object Object]"
 *      is identical for any two transactions, so tampering with an amount does
 *      not change the block hash. Must be `JSON.stringify(this.trans)`.
 *
 * M14. addTrans() error string reads 'Trasaction must include from and to
 *      address' — misspelling of 'Transaction'.
 *
 * M15. Blank (18) is the only place `difficulty` is ever introduced, yet blank
 *      (25) passes `this.difficulty` to mineBlock(). If (18) is filled with
 *      anything other than `this.difficulty = <n>` the while-loop in
 *      mineBlock() compares against `Array(NaN + 1)` and throws.
 *
 * M16. Cosmetic / consistency: the JSDoc and `@returns {Block}` annotations
 *      refer to classes `Block` and `Transaction`, which do not exist here —
 *      they are `Bk` and `TransRecord`.
 */