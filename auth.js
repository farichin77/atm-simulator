const inquirer = require('inquirer').default;
const bcrypt = require('bcrypt');
const db = require('../db/connection');
const chalk = require('chalk').default;

// Fungsi helper UI
function printHeader(title = 'ATM CLI') {
  console.clear();
  console.log(chalk.bgCyan.black.bold(`  === ${title} ===  `));
  console.log();
}

function printFooter() {
  console.log();
  console.log(chalk.gray('✨ Terima kasih sudah menggunakan ATM CLI. 😊'));
  console.log();
}

function formatRupiah(amount) {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

// Register akun baru
async function register() {
  printHeader('Registrasi Akun Baru');
  try {
    const { name, pin } = await inquirer.prompt([
      { name: 'name', message: chalk.cyan('Masukkan nama:'), type: 'input' },
      { name: 'pin', message: chalk.cyan('Masukkan PIN (4 digit):'), type: 'password', mask: '*' }
    ]);

    if (!/^\d{4}$/.test(pin)) {
      console.log(chalk.red('❌ PIN harus 4 digit angka.'));
      printFooter();
      return;
    }

    const hashedPin = await bcrypt.hash(pin, 10);

    await db.query(
      'INSERT INTO accounts (name, pin, balance) VALUES (?, ?, 0)',
      [name, hashedPin]
    );

    console.log(chalk.greenBright('✅ Registrasi berhasil! Silakan login.'));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      console.log(chalk.yellow('⚠️ Nama sudah digunakan. Silakan coba nama lain.'));
    } else {
      console.error(chalk.red('❌ Gagal registrasi:'), err.message);
    }
  }
  printFooter();
}

// Login dan kembalikan user object jika sukses
async function login() {
  printHeader('Login Akun');
  try {
    const { name, pin } = await inquirer.prompt([
      { name: 'name', message: chalk.cyan('Masukkan nama:'), type: 'input' },
      { name: 'pin', message: chalk.cyan('Masukkan PIN (4 digit):'), type: 'password', mask: '*' }
    ]);

    const [rows] = await db.query('SELECT * FROM accounts WHERE name = ?', [name.trim()]);

    if (rows.length === 0) {
      console.log(chalk.red('❌ Akun tidak ditemukan!'));
      printFooter();
      return null;
    }

    const user = rows[0];
    const match = await bcrypt.compare(pin, user.pin);

    if (!match) {
      console.log(chalk.red('❌ PIN salah!'));
      printFooter();
      return null;
    }

    console.log(chalk.greenBright(`✅ Login berhasil! Selamat datang, ${user.name}.`));
    printFooter();
    return user;
  } catch (err) {
    console.error(chalk.red('❌ Gagal login:'), err.message);
    printFooter();
    return null;
  }
}

// Cek saldo
async function checkBalance(user) {
  printHeader('Cek Saldo');
  const [rows] = await db.query('SELECT balance FROM accounts WHERE id = ?', [user.id]);
  console.log(chalk.blueBright.bold(`💰 Saldo Anda: ${formatRupiah(rows[0].balance)}`));
  printFooter();
}

// Setor saldo dengan simpan histori transaksi
async function deposit(user) {
  printHeader('Setor Tunai');
  console.log(chalk.blue(`💰 Saldo saat ini: ${formatRupiah(user.balance)}`));
  const { amount } = await inquirer.prompt([
    {
      name: 'amount',
      message: chalk.cyan('Masukkan jumlah setor (contoh: 50000):'),
      type: 'number',
      validate: (val) => (val > 0 ? true : 'Jumlah harus lebih dari 0'),
      filter: (val) => Number(val),
    },
  ]);

  await db.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, user.id]);
  await db.query(
    'INSERT INTO transactions (account_id, type, amount, description) VALUES (?, ?, ?, ?)',
    [user.id, 'deposit', amount, 'Setor tunai']
  );
  await db.query(
    'INSERT INTO transaction_history (user_id, type, amount) VALUES (?, ?, ?)',
    [user.id, 'deposit', amount]
  );

  const [updated] = await db.query('SELECT * FROM accounts WHERE id = ?', [user.id]);
  Object.assign(user, updated[0]);

  console.log(chalk.greenBright(`✅ Setor berhasil!`));
  console.log(chalk.green(`Jumlah: ${formatRupiah(amount)}`));
  console.log(chalk.blueBright(`Saldo sekarang: ${formatRupiah(user.balance)}`));
  printFooter();
}

// Tarik tunai dengan simpan histori transaksi
async function withdraw(user) {
  printHeader('Tarik Tunai');
  console.log(chalk.blue(`💰 Saldo saat ini: ${formatRupiah(user.balance)}`));
  const { amount } = await inquirer.prompt([
    {
      name: 'amount',
      message: chalk.cyan('Masukkan jumlah tarik tunai (contoh: 50000):'),
      type: 'number',
      validate: (val) => (val > 0 ? true : 'Jumlah harus lebih dari 0'),
      filter: (val) => Number(val),
    },
  ]);

  if (amount > user.balance) {
    console.log(chalk.red.bold('❌ Saldo tidak cukup.'));
    printFooter();
    return;
  }

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: chalk.yellow(`⚠️ Apakah Anda yakin ingin tarik tunai ${formatRupiah(amount)}?`),
    },
  ]);

  if (!confirm) {
    console.log(chalk.yellow('✋ Transaksi dibatalkan.'));
    printFooter();
    return;
  }

  await db.query('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, user.id]);
  await db.query(
    'INSERT INTO transactions (account_id, type, amount, description) VALUES (?, ?, ?, ?)',
    [user.id, 'withdraw', amount, 'Tarik tunai']
  );
  await db.query(
    'INSERT INTO transaction_history (user_id, type, amount) VALUES (?, ?, ?)',
    [user.id, 'withdraw', amount]
  );

  const [updated] = await db.query('SELECT * FROM accounts WHERE id = ?', [user.id]);
  Object.assign(user, updated[0]);

  console.log(chalk.greenBright(`✅ Tarik tunai berhasil!`));
  console.log(chalk.green(`Jumlah: ${formatRupiah(amount)}`));
  console.log(chalk.blueBright(`Saldo sekarang: ${formatRupiah(user.balance)}`));
  printFooter();
}

// Transfer antar akun dengan simpan histori transaksi
async function transfer(user) {
  printHeader('Transfer Dana');
  console.log(chalk.blue(`💰 Saldo saat ini: ${formatRupiah(user.balance)}`));
  const { recipient, amount } = await inquirer.prompt([
    { name: 'recipient', message: chalk.cyan('Masukkan nama penerima:'), type: 'input' },
    {
      name: 'amount',
      message: chalk.cyan('Masukkan jumlah transfer (contoh: 50000):'),
      type: 'number',
      validate: (val) => (val > 0 ? true : 'Jumlah harus lebih dari 0'),
      filter: (val) => Number(val),
    },
  ]);

  if (recipient.trim().toLowerCase() === user.name.trim().toLowerCase()) {
    console.log(chalk.red.bold('❌ Tidak bisa transfer ke diri sendiri.'));
    printFooter();
    return;
  }

  const [receiverRows] = await db.query('SELECT * FROM accounts WHERE LOWER(name) = ?', [recipient.trim().toLowerCase()]);
  if (receiverRows.length === 0) {
    console.log(chalk.red.bold('❌ Penerima tidak ditemukan.'));
    printFooter();
    return;
  }
  const receiver = receiverRows[0];

  if (amount > user.balance) {
    console.log(chalk.red.bold('❌ Saldo tidak cukup.'));
    printFooter();
    return;
  }

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: chalk.yellow(`⚠️ Apakah Anda yakin ingin transfer ${formatRupiah(amount)} ke ${receiver.name}?`),
    },
  ]);
  if (!confirm) {
    console.log(chalk.yellow('✋ Transaksi dibatalkan.'));
    printFooter();
    return;
  }

  await db.query('START TRANSACTION');
  try {
    await db.query('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, user.id]);
    await db.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, receiver.id]);

    await db.query(
      'INSERT INTO transactions (account_id, type, amount, description) VALUES (?, ?, ?, ?)',
      [user.id, 'transfer_out', amount, `Transfer ke ${receiver.name}`]
    );
    await db.query(
      'INSERT INTO transactions (account_id, type, amount, description) VALUES (?, ?, ?, ?)',
      [receiver.id, 'transfer_in', amount, `Transfer dari ${user.name}`]
    );

    await db.query(
      'INSERT INTO transaction_history (user_id, type, amount, target_user_id) VALUES (?, ?, ?, ?)',
      [user.id, 'transfer_out', amount, receiver.id]
    );
    await db.query(
      'INSERT INTO transaction_history (user_id, type, amount, target_user_id) VALUES (?, ?, ?, ?)',
      [receiver.id, 'transfer_in', amount, user.id]
    );

    await db.query('COMMIT');

    const [updated] = await db.query('SELECT * FROM accounts WHERE id = ?', [user.id]);
    Object.assign(user, updated[0]);

    console.log(chalk.greenBright(`✅ Transfer berhasil!`));
    console.log(chalk.green(`Jumlah: ${formatRupiah(amount)}`));
    console.log(chalk.blueBright(`Saldo sekarang: ${formatRupiah(user.balance)}`));
  } catch (err) {
    await db.query('ROLLBACK');
    console.log(chalk.red('❌ Gagal melakukan transfer:'), err.message);
  }
  printFooter();
}

// Fungsi baru: Menampilkan histori transaksi user
async function showTransactionHistory(user) {
  printHeader('Histori Transaksi');
  const [rows] = await db.query(
    `SELECT th.*, 
      a1.name AS user_name, 
      a2.name AS target_name
    FROM transaction_history th
    LEFT JOIN accounts a1 ON th.user_id = a1.id
    LEFT JOIN accounts a2 ON th.target_user_id = a2.id
    WHERE th.user_id = ?
    ORDER BY th.created_at DESC
    LIMIT 20`, 
    [user.id]
  );

  if (rows.length === 0) {
    console.log(chalk.yellow('⚠️ Belum ada histori transaksi.'));
  } else {
    for (const tr of rows) {
      const date = new Date(tr.created_at).toLocaleString('id-ID');
      let info = chalk.gray(`${date}`) + ' | ' + chalk.magenta(tr.type.toUpperCase()) + ' | ' + chalk.green(formatRupiah(tr.amount));
      if (tr.type === 'transfer_in') {
        info += chalk.cyan(` dari ${tr.target_name || 'Unknown'}`);
      } else if (tr.type === 'transfer_out') {
        info += chalk.cyan(` ke ${tr.target_name || 'Unknown'}`);
      }
      console.log(info);
    }
  }
  printFooter();
}

module.exports = { register, login, checkBalance, deposit, withdraw, transfer, showTransactionHistory };


