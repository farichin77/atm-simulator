const { program } = require('commander');
const inquirer = require('inquirer').default;
const chalk = require('chalk').default;
const {
  register,
  login,
  checkBalance,
  deposit,
  withdraw,
  transfer,
  showTransactionHistory, // pastikan ada di auth.js
} = require('./commands/auth');

let currentUser = null;

async function pause() {
  await inquirer.prompt({
    type: 'input',
    name: 'continue',
    message: chalk.gray('Tekan ENTER untuk melanjutkan...'),
  });
}

async function mainMenu() {
  while (true) {
    console.clear();
    console.log(chalk.green('=== ATM CLI ==='));
    console.log(chalk.blue(`Selamat datang, ${currentUser.name}!`));
    console.log(chalk.yellow(`Saldo Anda: Rp ${currentUser.balance.toLocaleString('id-ID')}`));
    console.log('----------------------------');

    const { action } = await inquirer.prompt({
      type: 'list',
      name: 'action',
      message: 'Pilih menu:',
      choices: [
        'Cek Saldo',
        'Setor',
        'Tarik Tunai',
        'Transfer',
        'Histori Transaksi',  // Tambahan menu histori
        'Logout',
      ],
    });

    switch (action) {
      case 'Cek Saldo':
        await checkBalance(currentUser);
        await pause();
        break;
      case 'Setor':
        await deposit(currentUser);
        await pause();
        break;
      case 'Tarik Tunai':
        await withdraw(currentUser);
        await pause();
        break;
      case 'Transfer':
        await transfer(currentUser);
        await pause();
        break;
      case 'Histori Transaksi':
        await showTransactionHistory(currentUser);
        await pause();
        break;
      case 'Logout':
        console.log(chalk.cyan(`👋 Terima kasih, ${currentUser.name}. Sampai jumpa!`));
        currentUser = null;
        return;
    }
  }
}

async function startMenu() {
  while (true) {
    console.clear();
    console.log(chalk.green('=== ATM CLI APP ==='));
    const { choice } = await inquirer.prompt({
      type: 'list',
      name: 'choice',
      message: 'Pilih aksi:',
      choices: ['Login', 'Register', 'Keluar'],
    });

    switch (choice) {
      case 'Login':
        const user = await login();
        if (user) {
          currentUser = user;
          await mainMenu();
        } else {
          await pause();
        }
        break;
      case 'Register':
        await register();
        await pause();
        break;
      case 'Keluar':
        console.log(chalk.cyan('👋 Sampai jumpa!'));
        process.exit(0);
    }
  }
}

// Commander CLI (optional)
program
  .command('register')
  .description('📝 Daftar akun baru')
  .action(async () => {
    await register();
    await pause();
  });

program
  .command('login')
  .description('🔐 Login ke akun')
  .action(async () => {
    const user = await login();
    if (user) {
      currentUser = user;
      await mainMenu();
    } else {
      await pause();
    }
  });

// Jalankan menu utama kalau tanpa argumen
(async () => {
  if (!process.argv.slice(2).length) {
    await startMenu();
  } else {
    program.parse(process.argv);
  }
})();
