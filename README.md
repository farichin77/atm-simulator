# atm-simulator
Hi! I'm **Ahmad Farichin**, and this is a Command-Line Interface (CLI) ATM simulation app created as part of the **Digital Skill Fair 39** bootcamp organized by [@dibimbing](https://www.linkedin.com/company/dibimbing-id/).

This project demonstrates how basic banking operations can be simulated using **Node.js** and **MySQL**, with a clean and interactive CLI experience.

---

## ✨ Features

- User registration with secure password hashing (bcrypt)
- User login with authentication
- Balance inquiry
- Deposit funds
- Withdraw funds
- Transfer funds between users
- All transactions are logged in a MySQL database
- Transfer generates two entries (transfer out & transfer in)

---

## 🛠️ Technologies Used

- **Node.js**
- **MySQL**
- **Commander.js** – CLI command handling
- **Inquirer.js** – User interaction
- **bcrypt** – Password encryption
- **dotenv** – Environment configuration

---

## 🔧 How to Use

### 1. Clone the repo
```bash
git clone https://github.com/yourusername/atm-cli-app.git
cd atm-cli-app
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env` file:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=atm_app
```

### 4. Run the application
```bash
node index.js
```

### 5. Available CLI commands
```bash
node index.js register
node index.js login
node index.js check-balance
node index.js deposit
node index.js withdraw
node index.js transfer
```

---

## 🗃️ Database Overview

- `users` – Stores user credentials and account info
- `transactions` – Stores all transaction logs (deposit, withdraw, transfer)

---

## 🙌 Credits

Developed by **Ahmad Farichin**  
Bootcamp by [@dibimbing](https://www.linkedin.com/company/dibimbing-id/)

---

## 📬 Contact

Feel free to connect on [LinkedIn](https://www.linkedin.com/in/ahmadfarichin) or reach out if you'd like to collaborate!
